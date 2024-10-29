// WhisperService.js

import { execFile } from 'child_process';
import path from 'path';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

// Path to the Whisper Python script
const pythonScript = path.join(getDirName(), 'whisperTranscribe.py');

// Function to transcribe a single audio file using Whisper
export async function transcribeFileWithWhisper(filePath, username) {
  return new Promise((resolve, reject) => {
    execFile('python3', [pythonScript, filePath], (error, stdout, stderr) => {
      if (error) {
        logger(`Error during transcription for ${username}: ${error.message}`, 'error');
        reject(error);
        return;
      }

      if (stderr) {
        logger(`Stderr during transcription for ${username}: ${stderr}`, 'warn');
      }

      try {
        const segments = JSON.parse(stdout);
        resolve(segments);
      } catch (parseError) {
        logger(`Failed to parse transcription output for ${username}: ${parseError.message}`, 'error');
        reject(parseError);
      }
    });
  });
}