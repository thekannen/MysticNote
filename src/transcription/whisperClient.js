import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import config from '../config/config.js';

/**
 * Transcribe audio files via the Whisper FastAPI service.
 * @param {Array<{speaker: string, filePath: string}>} speakerFiles
 * @returns {Promise<{segments: Array}>} Resolves with the transcription segments.
 */
export async function transcribe(speakerFiles) {
  const url = config.transcriptionService.url;
  const timeoutMs = config.transcriptionService.timeoutMs;

  // Build multipart form data
  const form = new FormData();
  for (const { speaker, filePath } of speakerFiles) {
    form.append('files', fs.createReadStream(filePath), {
      filename: `${speaker}.wav`
    });
  }

  // Set up timeout via AbortController
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Transcription service error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data; // { segments: [...] }
}
