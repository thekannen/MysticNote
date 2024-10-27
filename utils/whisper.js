import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { generateTimestamp } from '../utils.js';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Transcribes all audio files in a session folder and saves the transcriptions
export async function transcribeAndSaveSessionFolder(sessionName) {
  const sessionFolderPath = path.join(__dirname, '../recordings', sessionName);
  if (!fs.existsSync(sessionFolderPath)) {
    logger(`Session folder not found: ${sessionFolderPath}`, 'error');
    return { summary: null, transcriptionFile: null };
  }

  // Get all .wav files in the session folder
  const sessionFiles = fs.readdirSync(sessionFolderPath).filter(file => file.endsWith('.wav'));
  logger(`Transcribing session files from folder: ${sessionFolderPath}`, 'info');

  const sessionTranscriptsDir = path.join(__dirname, '../transcripts', sessionName);
  if (!fs.existsSync(sessionTranscriptsDir)) {
    fs.mkdirSync(sessionTranscriptsDir, { recursive: true });
  }

  // Collect transcriptions with timestamps
  let transcriptions = [];

  for (const file of sessionFiles) {
    const filePath = path.join(sessionFolderPath, file);
    const username = path.basename(file).split('_')[1];
    const fileCreationTime = fs.statSync(filePath).birthtime; // Capture file creation time as starting timestamp

    logger(`Transcribing ${filePath} for ${username}`, 'info');

    const transcriptionText = await transcribeFile(filePath, username, fileCreationTime);
    if (transcriptionText) {
      transcriptions.push({
        timestamp: fileCreationTime,
        username,
        text: transcriptionText
      });
    } else {
      logger(`Transcription failed for file ${filePath}`, 'error');
    }
  }

  // Sort transcriptions by timestamp to maintain the chronological order
  transcriptions.sort((a, b) => a.timestamp - b.timestamp);

  // Create a combined transcription with formatted timestamps
  const combinedTranscription = transcriptions.map(entry => `${entry.timestamp.toLocaleString()} - ${entry.username}: ${entry.text}`).join('\n\n');

  // Save individual transcription files in the session directory
  const finalFilePath = path.join(sessionTranscriptsDir, `full_conversation_log_${generateTimestamp().replace(/[:.]/g, '-')}.txt`);
  fs.writeFileSync(finalFilePath, combinedTranscription);

  logger(`Full transcription saved as ${finalFilePath}`, 'info');
  const summary = await generateSummary(combinedTranscription);
  return { summary, transcriptionFile: finalFilePath };
}

// Transcribes a single audio file and returns the transcription text
async function transcribeFile(filePath, username, startTime) {
  if (!fs.existsSync(filePath)) {
    logger(`Audio file not found for transcription: ${filePath}`, 'error');
    return null;
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('model', 'whisper-1');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const data = await response.json();
    if (data.text) {
      const transcriptionText = data.text;
      logger(`Transcription completed for ${username}`, 'info');
      return transcriptionText;
    } else {
      logger('Transcription failed:', 'error');
      return null;
    }
  } catch (error) {
    logger('Failed to transcribe audio:', 'error');
    return null;
  }
}


// Generates a summary from the combined transcription text
export async function generateSummary(transcriptionText) {
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
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      const summary = data.choices[0].message.content.trim();
      logger(`Summary generated: ${summary}`, 'info');
      return summary;
    } else {
      logger('No summary available.', 'error');
      return 'No summary available';
    }
  } catch (error) {
    logger('Failed to generate summary:', 'error');
    return 'Summary generation failed';
  }
}
