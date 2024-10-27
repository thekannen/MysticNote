import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { generateTimestamp } from '../utils.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const transcriptsDir = path.join(__dirname, '../transcripts');
if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir);

export async function transcribeAndSaveSessionFiles(sessionFiles) {
  console.log(`Transcribing session files: ${sessionFiles.join(', ')}`);
  let combinedTranscription = '';

  for (const filePath of sessionFiles) {
    const username = path.basename(filePath).split('_')[1];
    console.log(`Transcribing ${filePath} for ${username}`);

    const transcriptionText = await transcribeFile(filePath, username);
    if (transcriptionText) {
      combinedTranscription += `${transcriptionText}\n\n`;
    } else {
      console.error(`Transcription failed for file ${filePath}`);
    }
  }

  const timestamp = generateTimestamp().replace(/[:.]/g, '-');
  const finalFilePath = path.join(transcriptsDir, `full_conversation_log_${timestamp}.txt`);
  fs.writeFileSync(finalFilePath, combinedTranscription);

  console.log(`Full transcription saved as ${finalFilePath}`);
  const summary = await generateSummary(combinedTranscription);
  return { summary, transcriptionFile: finalFilePath };
}

async function transcribeFile(filePath, username) {
  if (!fs.existsSync(filePath)) {
    console.error(`Audio file not found for transcription: ${filePath}`);
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
      const timestamp = new Date().toLocaleString();
      const transcriptionText = `${timestamp} - ${username}: ${data.text}`;
      console.log(`Transcription completed for ${username}: ${transcriptionText}`);
      return transcriptionText;
    } else {
      console.error('Transcription failed:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Failed to transcribe audio:', error);
    return null;
  }
}

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
      console.log(`Summary generated: ${summary}`);
      return summary;
    } else {
      console.error('No summary available.');
      return 'No summary available';
    }
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return 'Summary generation failed';
  }
}
