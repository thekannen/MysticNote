import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import config from '../config/config.js';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

// Generates a summary from the transcription text using the OpenAI API
export async function generateSummary(transcriptionText, sessionName) {
  const prompt = `
    Here is a conversation transcript. Please summarize the conversation, ignoring any background noise, music, or non-speech sounds. Focus only on the spoken content and relevant dialog.

    Transcript:
    ${transcriptionText}

    Summary:
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
        max_tokens: 150,
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      const summary = data.choices[0].message.content.trim();
      const sessionTranscriptsDir = path.join(transcriptsDir, sessionName);
      saveSummaryToFile(sessionTranscriptsDir, sessionName, summary);

      logger(`Summary generated: ${summary}`, 'info');
      return summary;
    } else {
      logger('No summary available.', 'error');
      return 'No summary available';
    }
  } catch (apiError) {
    logger(`Failed to generate summary: ${apiError.message}`, 'error');
    return 'Summary generation failed';
  }
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