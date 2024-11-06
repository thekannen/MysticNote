import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import config from '../config/config.js';
import { getAttendees } from './transcriptionService.js';
import { encoding_for_model } from '@dqbd/tiktoken';
import { log } from 'console';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');
const modelFilePath = path.join(getDirName(), '../utils/modelTokenLimits.json');

let modelTokenLimits = {};

// Import the model token limits JSON file
try {
  const data = await fs.readFile(modelFilePath, 'utf8');
  modelTokenLimits = JSON.parse(data);
} catch (error) {
  logger('Error loading model token limits:', 'error');
  process.exit(1);
}

// Fetches the maximum tokens for the specified model
function getModelMaxTokens(modelName) {
  const modelInfo = modelTokenLimits.models[modelName];
  if (modelInfo) {
    return modelInfo.maxTotalTokens;
  } else {
    logger(`Model ${modelName} not found in token limits configuration.`, 'warn');
    return null;
  }
}

// Initializes model-specific limits based on the chosen model
function initializeModelSettings(modelName) {
  const maxTokens = getModelMaxTokens(modelName) || 4096; // Fallback to default if not found
  const maxCompletionTokens = Math.floor(maxTokens * 0.25); // Reserve 25% for completion
  const maxPromptTokens = maxTokens - maxCompletionTokens;

  logger(
    `Initialized ${modelName} settings: maxTokens = ${maxTokens}, maxPromptTokens = ${maxPromptTokens}, maxCompletionTokens = ${maxCompletionTokens}`, 'debug'
  );
  return { maxTokens, maxPromptTokens, maxCompletionTokens };
}

// Run this to initialize and set limits for the chosen model
const {
  maxTokens: MAX_API_TOKENS,
  maxPromptTokens: MAX_PROMPT_TOKENS,
  maxCompletionTokens: MAX_COMPLETION_TOKENS,
} = initializeModelSettings(config.openAIModel || 'gpt-3.5-turbo');

// Initialize the tokenizer
const tokenizer = encoding_for_model(config.openAIModel || 'gpt-3.5-turbo');

// Define the prompt template
const promptTemplate = `Please provide a concise summary of the following conversation excerp, as well as providing key points and events in a bulleted format.

Conversation Excerpt:
`;

// Splits the transcription text into chunks based on token count
function splitTextIntoTokenChunks(text, maxTokens) {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = '';
  let currentTokenCount = 0;

  for (const word of words) {
    const wordTokenCount = tokenizer.encode(word + ' ').length; // Include space

    if (currentTokenCount + wordTokenCount > maxTokens) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      currentTokenCount = 0;
    }

    currentChunk += word + ' ';
    currentTokenCount += wordTokenCount;
  }

  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Retry logic for API requests with exponential backoff
async function retryRequest(requestFn, retries = 3) {
  let delay = 1000; // Start with 1 second
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      logger(`Attempt ${attempt} failed: ${error.message}`, 'warn');
      if (attempt === retries) throw new Error(`All ${retries} attempts failed`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Helper function to generate the prompt
function generatePrompt(text) {
  return `${promptTemplate}${text}\n\nSummary:`;
}

// Generates a summary from the transcription text using the OpenAI API
export async function generateSummary(transcriptionText, sessionName) {
  // Calculate available tokens for the text in the prompt
  const promptTokenCount = tokenizer.encode(promptTemplate).length;
  const availableTokensForText = MAX_PROMPT_TOKENS - promptTokenCount;

  // Split the transcription text into chunks based on token limits
  const chunks = splitTextIntoTokenChunks(transcriptionText, availableTokensForText);
  let summaries = [];

  for (const [index, chunk] of chunks.entries()) {
    const prompt = generatePrompt(chunk);

    logger(
      `Sending API request for chunk ${index + 1}/${chunks.length} with token length: ${tokenizer.encode(prompt).length}`, 'debug'
    );

    try {
      const response = await retryRequest(() =>
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.openAIModel || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: MAX_COMPLETION_TOKENS,
            temperature: 0.5,
          }),
        })
      );

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        const chunkSummary = data.choices[0].message.content.trim();
        summaries.push(chunkSummary);
        // logger(`Chunk summary generated: ${chunkSummary}`, 'debug');
      } else {
        logger('No summary available for this chunk.', 'error');
        logger(`API response: ${JSON.stringify(data)}`, 'debug');
      }
    } catch (apiError) {
      logger(`Failed to generate summary for chunk after retries: ${apiError.message}`, 'error');
    }
  }

  // Hierarchical summarization if needed
  while (summaries.length > 1) {
    const combinedText = summaries.join('\n\n');
    const prompt = generatePrompt(combinedText);

    // Calculate token length and ensure it doesn't exceed limits
    const promptTokenCount = tokenizer.encode(prompt).length;
    if (promptTokenCount > MAX_PROMPT_TOKENS) {
      // Need to further split the summaries
      summaries = splitTextIntoTokenChunks(combinedText, MAX_PROMPT_TOKENS - tokenizer.encode(promptTemplate).length);
      continue; // Go back to summarizing the smaller chunks
    }

    logger(
      `Sending API request for combined summary with token length: ${tokenizer.encode(prompt).length}`, 'debug'
    );

    try {
      const response = await retryRequest(() =>
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.openAIModel || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: MAX_COMPLETION_TOKENS,
            temperature: 0.5,
          }),
        })
      );

      const data = await response.json();

      if (response.ok && data.choices && data.choices[0]?.message?.content) {
        const combinedSummary = data.choices[0].message.content.trim();
        summaries = [combinedSummary]; // Replace with the new combined summary
        // logger(`Combined summary generated: ${combinedSummary}`, 'debug');
      } else {
        logger('No combined summary available.', 'error');
        logger(`API response: ${JSON.stringify(data)}`, 'debug');
        break; // Exit the loop if unable to summarize further
      }
    } catch (apiError) {
      logger(`Failed to generate combined summary after retries: ${apiError.message}`, 'error');
      break; // Exit the loop if an error occurs
    }
  }

  const finalSummary = summaries[0] || 'No summary available';

  // Prepend attendees to the summary
  const attendees = getAttendees();
  const attendeesText = `Attendees: ${
    attendees.length > 0 ? attendees.join(', ') : 'No attendees recorded'
  }\n\n`;
  const fullSummary = attendeesText + finalSummary;

  // Save the summary to a file
  const sessionTranscriptsDir = path.join(transcriptsDir, sessionName);
  await saveSummaryToFile(sessionTranscriptsDir, sessionName, fullSummary);

  return fullSummary;
}

// Helper to save summary to a file
async function saveSummaryToFile(sessionTranscriptsDir, sessionName, summary) {
  try {
    await fs.mkdir(sessionTranscriptsDir, { recursive: true });
    const localTimestamp = generateTimestamp();
    const summaryFilePath = path.join(sessionTranscriptsDir, `summary_${sessionName}_${localTimestamp}.txt`);
    await fs.writeFile(summaryFilePath, summary, 'utf8');
    logger(`Summary successfully saved to ${summaryFilePath}`, 'info');
    logger(`Summary saved to file path: ${summaryFilePath}`, 'verbose');
  } catch (error) {
    logger(`Error saving summary to file: ${error.message}`, 'error');
  }
}