import { execFile } from 'child_process';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { getDirName } from '../utils/common.js';
import { logger, verboseLog } from '../utils/logger.js';

// Promisify execFile for async/await
const execFileAsync = promisify(execFile);

// Path to the Whisper Python script
const pythonScript = path.join(getDirName(), '../whisper/whisperTranscribe.py');

// Determine the Python command based on the OS
const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';

/**
 * Transcribes a single audio file using Whisper.
 *
 * @param {string} filePath - The path to the audio file.
 * @param {string} username - The username associated with the audio file.
 * @returns {Promise<Array|null>} - The transcription segments or null if an error occurs.
 */
export async function transcribeFileWithWhisper(filePath, username) {
  verboseLog(`Starting transcription for ${username} with file at: ${filePath}`);

  try {
    const { stdout, stderr } = await execFileAsync(pythonCommand, [pythonScript, filePath]);

    if (stderr) {
      logger(`Stderr during transcription for ${username}: ${stderr}`, 'warn');
    }

    // Ensure stdout is not empty
    if (!stdout || stdout.trim() === '') {
      logger(`No output received from transcription script for ${username}.`, 'error');
      return null;
    }

    try {
      const segments = JSON.parse(stdout);
      // verboseLog(`Parsed transcription segments for ${username}: ${JSON.stringify(segments, null, 2)}`);
      return segments;
    } catch (parseError) {
      logger(`Failed to parse transcription output for ${username}: ${parseError.message}`, 'error');
      verboseLog(`Output received: ${stdout}`);
      return null;
    }
  } catch (error) {
    logger(`Error during transcription for ${username}: ${error.message}`, 'error');
    verboseLog(`Stack trace: ${error.stack}`);
    return null;
  }
}
