import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

const pythonScript = path.join(getDirName(), '../whisper/whisperTranscribe.py');
const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';

/**
 * Transcribes a single audio file using Whisper with progress updates.
 *
 * @param {string} filePath - The path to the audio file.
 * @param {string} username - The username associated with the audio file.
 * @returns {Promise<Array|null>} - The transcription segments or null if an error occurs.
 */
export async function transcribeFileWithWhisper(filePath, username) {
  logger(`Starting transcription for ${username} with file at: ${filePath}`, 'verbose');

  return new Promise((resolve, reject) => {
    const process = spawn(pythonCommand, [pythonScript, filePath]);

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim() !== '') {
          try {
            const jsonLine = JSON.parse(line);
            if (jsonLine.progress !== undefined) {
              // This is a progress update
              logger(`Transcription progress for ${username}: ${jsonLine.progress.toFixed(2)}%`, 'info');
            } else {
              // This is part of the final output
              output += line;
            }
          } catch (e) {
            // Not JSON, might be part of the final result
            output += line;
          }
        }
      }
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
      logger(`Stderr during transcription for ${username}: ${data.toString()}`, 'warn');
    });

    process.on('close', (code) => {
      if (code !== 0) {
        logger(`Transcription process exited with code ${code} for ${username}`, 'error');
        logger(`Stderr: ${errorOutput}`, 'error');
        reject(new Error(`Transcription process exited with code ${code}`));
      } else {
        // Parse the final output
        try {
          const segments = JSON.parse(output);
          resolve(segments);
        } catch (parseError) {
          logger(`Failed to parse transcription output for ${username}: ${parseError.message}`, 'error');
          logger(`Output received: ${output}`, 'debug');
          reject(parseError);
        }
      }
    });
  });
}
