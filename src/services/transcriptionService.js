import fs from 'fs/promises';
import path from 'path';
import { transcribeFileWithWhisper } from './whisperService.js';
import { generateSummary } from './summaryService.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import { logger, verboseLog } from '../utils/logger.js';
import config from '../config/config.js';
import { DateTime } from 'luxon';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');
const recordingsDir = path.join(getDirName(), '../../bin/recordings');

// Set to track unique attendees
const attendees = new Set();

function addAttendee(username) {
  attendees.add(username);
}

export function getAttendees() {
  return Array.from(attendees);
}

/**
 * Transcribes all audio files in a session folder, combines them into a single chronological transcript,
 * and saves the full transcription and summary.
 *
 * @param {string} sessionName - The name of the session.
 * @returns {Promise<{summary: string|null, transcriptionFile: string|null}>} - The summary and transcription file path.
 */
export async function transcribeAndSaveSessionFolder(sessionName) {
  const sessionFolderPath = path.join(recordingsDir, sessionName);

  try {
    await fs.access(sessionFolderPath);
  } catch {
    logger(`Session folder not found: ${sessionFolderPath}`, 'error');
    return { summary: null, transcriptionFile: null };
  }

  const files = await fs.readdir(sessionFolderPath);
  const sessionFiles = files.filter((file) => file.endsWith('.wav'));
  const sessionTranscriptsDir = path.join(transcriptsDir, sessionName);

  try {
    await fs.mkdir(sessionTranscriptsDir, { recursive: true });
    verboseLog(`Created directory for transcripts: ${sessionTranscriptsDir}`);
  } catch (error) {
    logger(`Failed to create transcripts directory: ${error.message}`, 'error');
    return { summary: null, transcriptionFile: null };
  }

  let transcriptions = [];

  for (const file of sessionFiles) {
    const filePath = path.join(sessionFolderPath, file);

    // Extract username and timestamp from the file name
    const { username, fileStartTime } = parseFileName(file);

    if (!username || !fileStartTime) {
      logger(`Skipping file due to parsing error: ${file}`, 'warn');
      continue;
    }

    // Track this user as an attendee
    addAttendee(username);

    // Transcribe the audio file
    const transcriptionSegments = await transcribeFileWithWhisper(filePath, username);

    if (transcriptionSegments && transcriptionSegments.length > 0) {
      transcriptions.push(
        ...transcriptionSegments.map((segment) => ({
          start: fileStartTime.plus({ seconds: segment.start }),
          end: fileStartTime.plus({ seconds: segment.end }),
          username,
          text: segment.text.trim(),
        }))
      );
      verboseLog(`Transcription segments added for ${username} from file: ${filePath}`);
    } else {
      verboseLog(`No transcription segments found for ${filePath}`, 'warn');
    }

  if (transcriptions.length === 0) {
    logger(`No transcriptions were generated for session: ${sessionName}`, 'warn');
    return { summary: null, transcriptionFile: null };
  }

  const aggregatedTranscriptions = aggregateTranscriptions(transcriptions);
  const combinedTranscription = formatTranscription(aggregatedTranscriptions);

  const timestamp = generateTimestamp().replace(/[: ]/g, '-');
  const finalFilePath = path.join(sessionTranscriptsDir, `full_conversation_log_${timestamp}.txt`);

  try {
    await fs.writeFile(finalFilePath, combinedTranscription, 'utf-8');
    logger(`Full transcription saved as ${finalFilePath}`, 'info');
  } catch (error) {
    logger(`Failed to save transcription file: ${error.message}`, 'error');
    return { summary: null, transcriptionFile: null };
  }

  const summary = await generateSummary(combinedTranscription, sessionName);

  if (summary && !config.saveRecordings) {
    for (const file of sessionFiles) {
      const filePath = path.join(sessionFolderPath, file);
      try {
        await fs.unlink(filePath);
        logger(`Deleted recording file: ${filePath}`, 'info');
      } catch (error) {
        logger(`Failed to delete recording file ${filePath}: ${error.message}`, 'error');
      }
    }
  }

  return { summary, transcriptionFile: finalFilePath };
}

/**
 * Parses the file name to extract the username and the recording start time.
 *
 * @param {string} fileName - The name of the file.
 * @returns {{username: string|null, fileStartTime: DateTime|null}} - The username and start time.
 */
function parseFileName(fileName) {
  try {
    const baseName = path.basename(fileName, path.extname(fileName));
    const parts = baseName.split('_');
    if (parts.length < 4) {
      logger(`Invalid file name format: ${fileName}`, 'warn');
      return { username: null, fileStartTime: null };
    }

    // Expected format: audio_username_userId_timestamp.wav
    const username = parts[1];
    const userId = parts[2];
    const timestampString = parts.slice(3).join('_'); // In case the username contains underscores

    // Parse the timestamp using the configured timezone
    const timezone = config.timezone && config.timezone !== 'local' ? config.timezone : undefined;
    const fileStartTime = timezone
      ? DateTime.fromFormat(timestampString, "yyyy-MM-dd'T'HH-mm-ss", { zone: timezone })
      : DateTime.fromFormat(timestampString, "yyyy-MM-dd'T'HH-mm-ss");

    if (!fileStartTime.isValid) {
      logger(`Invalid timestamp in file name: ${fileName}`, 'error');
      return { username: null, fileStartTime: null };
    }

    return { username, fileStartTime };
  } catch (error) {
    logger(`Error parsing file name ${fileName}: ${error.message}`, 'error');
    return { username: null, fileStartTime: null };
  }
}

/**
 * Aggregates transcription segments from multiple users in chronological order.
 *
 * @param {Array} transcriptions - The transcription segments.
 * @returns {Array} - The aggregated and sorted transcription segments.
 */
function aggregateTranscriptions(transcriptions) {
  // Sort all transcription segments by start time
  transcriptions.sort((a, b) => a.start.toMillis() - b.start.toMillis());

  return transcriptions;
}

/**
 * Formats transcription entries for readability.
 *
 * @param {Array} transcriptions - The transcription entries.
 * @returns {string} - The formatted transcription.
 */
function formatTranscription(transcriptions) {
  return transcriptions
    .map((entry) => {
      const start = entry.start.toFormat('yyyy-MM-dd HH:mm:ss');
      const end = entry.end.toFormat('yyyy-MM-dd HH:mm:ss');
      return `[${start} - ${end}] ${entry.username}: ${entry.text}`;
    })
    .join('\n');
}
}