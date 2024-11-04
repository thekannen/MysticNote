import { execFile } from 'child_process';
import path from 'path';
import os from 'os';
import { getDirName } from '../utils/common.js';
import { logger, verboseLog } from '../utils/logger.js';

// Path to the Whisper Python script
const pythonScript = path.join(getDirName(), '../whisper/whisperTranscribe.py');

// Determine the Python command based on the OS
const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';

// Function to transcribe a single audio file using Whisper
export async function transcribeFileWithWhisper(filePath, username) {
  verboseLog(`Starting transcription for ${username} with file at: ${filePath}`);  

  return new Promise((resolve, reject) => {
    execFile(pythonCommand, [pythonScript, filePath], (error, stdout, stderr) => {
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
        //verboseLog(`Parsed transcription segments for ${username}: ${JSON.stringify(segments, null, 2)}`);
        resolve(segments);
      } catch (parseError) {
        logger(`Failed to parse transcription output for ${username}: ${parseError.message}`, 'error');
        reject(parseError);
      }
    });
  });
}