import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import fs from 'fs';
import path from 'path';
import { logger, verboseLog } from '../utils/logger.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import config from '../config/config.js';
import { getAttendees } from './transcriptionService.js';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');
const modelFilePath = path.join(getDirName(), '../utils/modelTokenLimits.json');
let modelTokenLimits = {};

// Import the model token limits JSON file
try {
  // Attempt to read and parse the configuration file
  modelTokenLimits = JSON.parse(fs.readFileSync(modelFilePath, 'utf8'));
} catch (error) {
  // Log an error if the configuration file fails to load
  logger("Error loading models:", 'err');
  process.exit(1); // Exit the process to prevent further issues
}

// Fetches the maximum tokens for the specified model
function getModelMaxTokens(modelName) {
  const modelInfo = modelTokenLimits.models[modelName];
  if (modelInfo) {
    return modelInfo.maxOutputTokens;
  } else {
    console.warn(`Model ${modelName} not found in token limits configuration.`);
    return null;
  }
}

// Initializes model-specific limits based on the chosen model
async function initializeModelSettings(modelName) {
  const maxTokens = await getModelMaxTokens(modelName) || 4096; // Fallback to default if not found
  const maxWordsPerChunk = Math.floor(maxTokens * 0.75); // Approximate words per chunk

  verboseLog(`Initialized ${modelName} settings: maxTokens = ${maxTokens}, maxWordsPerChunk = ${maxWordsPerChunk}`);
  return { maxTokens, maxWordsPerChunk };
}

// Run this to initialize and set limits for the chosen model
const { maxTokens: MAX_API_TOKENS, maxWordsPerChunk: MAX_WORDS_PER_CHUNK } = await initializeModelSettings(config.openAIModel || 'gpt-4-turbo');

// Splits the transcription text into sentence-based chunks
function splitTextIntoSentenceChunks(text, maxWords) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]; // Split by sentence-ending punctuation
  const chunks = [];
  let currentChunk = [];
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;

    // If adding this sentence exceeds maxWords, finalize the current chunk
    if (wordCount + sentenceWords > maxWords) {
      chunks.push(currentChunk.join(' ').trim());
      verboseLog(`Created chunk with ${wordCount} words`);
      currentChunk = []; // Reset chunk
      wordCount = 0; // Reset word count
    }

    currentChunk.push(sentence);
    wordCount += sentenceWords;
  }

  // Push any remaining content as the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' ').trim());
    verboseLog(`Final chunk created with ${wordCount} words`);
  }

  return chunks;
}

// Retry logic for API requests
async function retryRequest(requestFn, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      verboseLog(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) throw new Error(`All ${retries} attempts failed`);
    }
  }
}

// Generates a summary and key events list from the transcription text using the OpenAI API
export async function generateSummary(transcriptionText, sessionName) {
  const chunks = splitTextIntoSentenceChunks(transcriptionText, MAX_WORDS_PER_CHUNK);
  const chunkSummaries = [];
  const chunkKeyEvents = [];

  for (const chunk of chunks) {
    const prompt = `
      Here is a portion of a conversation transcript. Please summarize it, focusing on the spoken content and relevant dialog only.

      Transcript:
      ${chunk}

      Summary:
      
      Key Events:
      - first key event
      - second key event
    `;

    verboseLog(`Sending API request for chunk with content length: ${chunk.length}`);

    try {
      const response = await retryRequest(() => fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.openAIModel || 'gpt-4-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: MAX_API_TOKENS,
          temperature: 0.5,
        }),
      }));

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        const chunkSummary = data.choices[0].message.content.trim();
        const [summaryText, ...keyEvents] = chunkSummary.split('\n').filter(line => line.trim());

        chunkSummaries.push(summaryText);
        chunkKeyEvents.push(...keyEvents.map(event => event.trim()));

        //verboseLog(`Chunk summary generated: ${chunkSummary}`);
      } else {
        logger('No summary available for this chunk.', 'error');
        verboseLog(`API response: ${JSON.stringify(data)}`);
      }
    } catch (apiError) {
      logger(`Failed to generate summary for chunk after retries: ${apiError.message}`, 'error');
    }
  }

  // Truncate chunk summaries and key events if necessary
  const combinedSummaries = chunkSummaries.slice(0, Math.floor(MAX_API_TOKENS / 10)).join('\n\n');
  const combinedKeyEvents = chunkKeyEvents.slice(0, Math.floor(MAX_API_TOKENS / 10)).join('\n- ');
  const attendees = getAttendees();

  // Construct the summary prompt without attendees
  const finalSummaryPrompt = `
  Please summarize the following conversation and list key events:

  Summaries:
  ${combinedSummaries}

  Key Events:
  - ${combinedKeyEvents}
  `;

  verboseLog(`Sending final API request for combined summary`);

  let finalSummary;
  try {
    const finalResponse = await retryRequest(() => fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.openAIModel || 'gpt-4-turbo',
        messages: [{ role: 'user', content: finalSummaryPrompt }],
        max_tokens: MAX_API_TOKENS,
        temperature: 0.5,
      }),
    }));

    const finalData = await finalResponse.json();
    if (finalData.choices && finalData.choices[0]?.message?.content) {
      // Prepend attendees to the summary
      const attendeesText = `Attendees: ${attendees.length > 0 ? attendees.join(', ') : 'No attendees recorded'}\n\n`;

      finalSummary = attendeesText + finalData.choices[0].message.content.trim();
      const sessionTranscriptsDir = path.join(transcriptsDir, sessionName);          

      // Save the summary with attendees
      saveSummaryToFile(sessionTranscriptsDir, sessionName, finalSummary);

      verboseLog(`Final combined summary generated.`);
      logger(`Final combined summary generated successfully.`, 'info');
    } else {
      finalSummary = 'No final summary available';
      logger('Failed to generate a final combined summary.', 'error');
      verboseLog(`Final API response: ${JSON.stringify(finalData)}`);
    }
  } catch (apiError) {
    finalSummary = 'Final summary generation failed';
    logger(`Failed to generate final summary after retries: ${apiError.message}`, 'error');
  }

  return finalSummary;
}

// Helper to save summary to a file
function saveSummaryToFile(sessionTranscriptsDir, sessionName, summary) {
  if (!fs.existsSync(sessionTranscriptsDir)) {
    fs.mkdirSync(sessionTranscriptsDir, { recursive: true });
  }

  const localTimestamp = generateTimestamp();
  const summaryFilePath = path.join(sessionTranscriptsDir, `summary_${sessionName}_${localTimestamp}.txt`);

  fs.writeFileSync(summaryFilePath, summary);
  logger(`Summary successfully saved to ${summaryFilePath}`, 'info');
  verboseLog(`Summary saved to file path: ${summaryFilePath}`);
}