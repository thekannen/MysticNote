import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

export async function transcribeWithWhisper() {
  const filePath = 'test_audio.wav';
  if (!fs.existsSync(filePath)) {
    console.error('Audio file not found for transcription.');
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
    return data.text || null;
  } catch (error) {
    console.error('Failed to transcribe audio:', error);
    return null;
  }
}
