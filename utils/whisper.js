import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { generateTimestamp } from '../utils.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const transcriptsDir = path.join(__dirname, '../transcripts');
if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir); // Ensure directory exists

export async function transcribeAndSave(filePath, username) {
  console.log(`Transcribing ${filePath} for ${username}`);

  if (!fs.existsSync(filePath)) {
    console.error(`Audio file not found: ${filePath}`);
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
      const timestamp = generateTimestamp().replace(/[:.]/g, '-');
      const transcriptionText = `${timestamp} - ${username}: ${data.text}`;
      const transcriptionFile = path.join(transcriptsDir, `transcription_${username}_${timestamp}.txt`);

      // Ensure transcripts directory exists before writing the file
      if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir);

      fs.writeFileSync(transcriptionFile, transcriptionText);
      console.log(`Transcription saved as ${transcriptionFile}`);

      const summary = await generateSummary(data.text); // Pass transcription text, not timestamp
      return { summary, transcriptionFile };
    } else {
      console.error('Transcription failed:', data.error || 'No text received');
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
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim();
    } else {
      console.error('No summary available.');
      return 'No summary available';
    }
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return 'Summary generation failed';
  }
}
