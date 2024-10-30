import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import config from '../config/config.js';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

// Define model-specific limits
const modelTokenLimits = {
  'gpt-4-turbo-32k': { maxTokens: 32768, maxWordsPerChunk: 24576 },
  'gpt-4-turbo': { maxTokens: 8192, maxWordsPerChunk: 6144 },
  'gpt-3.5-turbo-16k': { maxTokens: 16384, maxWordsPerChunk: 12288 },
  'gpt-3.5-turbo': { maxTokens: 4096, maxWordsPerChunk: 3072 },
};

// Determine API limits based on the chosen model
function getApiLimits(modelName) {
  const defaultSettings = { maxTokens: 4096, maxWordsPerChunk: 3072 };
  return modelTokenLimits[modelName] || defaultSettings;
}

const { maxTokens: MAX_API_TOKENS, maxWordsPerChunk: MAX_WORDS_PER_CHUNK } = getApiLimits(config.openAIModel || 'gpt-4-turbo');

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
      currentChunk = [];
      wordCount = 0;
    }

    currentChunk.push(sentence);
    wordCount += sentenceWords;
  }

  // Push any remaining content as the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' ').trim());
  }

  return chunks;
}

// Generates a summary and key events list from the transcription text using the OpenAI API
export async function generateSummary(transcriptionText, sessionName) {
  const chunks = splitTextIntoSentenceChunks(transcriptionText, MAX_WORDS_PER_CHUNK);
  const chunkSummaries = [];
  const chunkKeyEvents = [];

  for (const chunk of chunks) {
    const prompt = `
      Here is a portion of a conversation transcript. Please summarize it, ignoring any background noise, music, or non-speech sounds. Focus only on the spoken content and relevant dialog.

      After the summary, provide a bulleted list of the key events in the order they happened.

      Transcript:
      ${chunk}

      Summary:
      
      Key Events:
      - first key event
      - second key event
      - etc.
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
      });

      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        const chunkSummary = data.choices[0].message.content.trim();
        const [summaryText, ...keyEvents] = chunkSummary.split('\n').filter(line => line.trim());

        chunkSummaries.push(summaryText);
        chunkKeyEvents.push(...keyEvents.map(event => event.trim()));

        logger(`Chunk summary generated: ${chunkSummary}`, 'info');
      } else {
        logger('No summary available for this chunk.', 'error');
      }
    } catch (apiError) {
      logger(`Failed to generate summary for chunk: ${apiError.message}`, 'error');
    }
  }

  // Combine all summaries into one API call for a final cohesive summary
  const finalSummaryPrompt = `
    Below are summaries and key events from parts of a longer conversation. Combine them into a single, cohesive summary that covers the entire conversation, followed by a complete list of key events in order.

    Summaries:
    ${chunkSummaries.join('\n\n')}

    Key Events:
    - ${chunkKeyEvents.join('\n- ')}

    Overall Summary:
    
    Key Events:
  `;

  let finalSummary;
  try {
    const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
    });

    const finalData = await finalResponse.json();
    if (finalData.choices && finalData.choices[0]?.message?.content) {
      finalSummary = finalData.choices[0].message.content.trim();
      const sessionTranscriptsDir = path.join(transcriptsDir, sessionName);
      saveSummaryToFile(sessionTranscriptsDir, sessionName, finalSummary);

      logger(`Final combined summary generated.`, 'info');
    } else {
      finalSummary = 'No final summary available';
      logger('Failed to generate a final combined summary.', 'error');
    }
  } catch (apiError) {
    finalSummary = 'Final summary generation failed';
    logger(`Failed to generate final summary: ${apiError.message}`, 'error');
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
}
