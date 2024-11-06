import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { transcribeFileWithWhisper } from './whisperService.js';
import { generateSummary } from './summaryService.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import { logger } from '../utils/logger.js';
import config from '../config/config.js';
import { DateTime } from 'luxon';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');
const recordingsDir = path.join(getDirName(), '../../bin/recordings');

// Promisify zlib functions
const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

// Set to track unique attendees
const attendees = new Set();

function addAttendee(username) {
  attendees.add(username);
}

export function getAttendees() {
  return Array.from(attendees);
}

/**
 * Reads a JSON or Gzipped JSON file.
 *
 * @param {string} filePath - Path to the JSON or JSON.gz file.
 * @returns {Promise<Object>} - Parsed JSON data.
 */
async function readJsonFile(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    if (filePath.endsWith('.gz')) {
      const decompressed = await gunzip(buffer);
      return JSON.parse(decompressed.toString('utf-8'));
    } else {
      return JSON.parse(buffer.toString('utf-8'));
    }
  } catch (error) {
    logger(`Error reading JSON file ${filePath}: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Writes a JSON file, optionally compressing it.
 *
 * @param {string} filePath - Path to the JSON or JSON.gz file.
 * @param {Object} data - Data to write.
 * @param {boolean} compress - Whether to compress the file.
 * @returns {Promise<void>}
 */
async function writeJsonFile(filePath, data, compress = false) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    if (compress) {
      const compressed = await gzip(jsonString);
      await fs.writeFile(`${filePath}.gz`, compressed);
    } else {
      await fs.writeFile(filePath, jsonString, 'utf-8');
    }
  } catch (error) {
    logger(`Error writing JSON file ${filePath}: ${error.message}`, 'error');
    throw error;
  }
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
    logger(`Created directory for transcripts: ${sessionTranscriptsDir}`, 'verbose');
  } catch (error) {
    logger(`Failed to create transcripts directory: ${error.message}`, 'error');
    return { summary: null, transcriptionFile: null };
  }

  // Audio settings used during recording
  const audioSettings = {
    rate:
      config.audioQuality === 'high'
        ? '48000'
        : config.audioQuality === 'medium'
        ? '24000'
        : '16000',
    channels: config.audioQuality === 'high' ? '2' : '1',
    codec: 'pcm_s16le',
  };

  let transcriptions = [];

  for (const file of sessionFiles) {
    const filePath = path.join(sessionFolderPath, file);

    // Skip timestamp files
    if (file.endsWith('_timestamps.json') || file.endsWith('_timestamps.json.gz')) continue;

    // Extract username from the file name
    const { username } = parseFileName(file);

    if (!username) {
      logger(`Skipping file due to parsing error: ${file}`, 'warn');
      continue;
    }

    // Track this user as an attendee
    addAttendee(username);

    // Read the timestamps
    let timestampFilePath = filePath.replace('.wav', '_timestamps.json');
    let isCompressed = false;

    // Check if compressed timestamp file exists
    try {
      await fs.access(`${timestampFilePath}.gz`);
      timestampFilePath = `${timestampFilePath}.gz`;
      isCompressed = true;
      logger(`Found compressed timestamps for ${username} at ${timestampFilePath}`, 'debug');
    } catch {
      logger(`No compressed timestamps found for ${username}, using uncompressed ${timestampFilePath}`, 'debug');
    }

    let timestampsData = null;
    try {
      timestampsData = await readJsonFile(timestampFilePath);
    } catch (error) {
      logger(`Failed to read timestamps for ${file}: ${error.message}`, 'error');
      continue;
    }

    // Transcribe the audio file
    const transcriptionSegments = await transcribeFileWithWhisper(filePath, username);

    if (transcriptionSegments && transcriptionSegments.length > 0) {
      // Adjust segment times using positions
      const adjustedSegments = adjustTranscriptionSegments(
        transcriptionSegments,
        timestampsData,
        username,
        audioSettings
      );

      transcriptions.push(...adjustedSegments);
      logger(`Transcription segments added for ${username} from file: ${filePath}`, 'debug');
    } else {
      logger(`No transcription segments found for ${filePath}`, 'warn');
    }

    // Optionally, compress the timestamps.json if not already compressed
    if (!isCompressed) {
      try {
        await writeJsonFile(timestampFilePath, timestampsData, true);
        await fs.unlink(timestampFilePath); // Remove the uncompressed file
        logger(`Compressed timestamps for ${username} to ${timestampFilePath}.gz`, 'debug');
      } catch (error) {
        logger(`Failed to compress timestamps for ${username}: ${error.message}`, 'error');
      }
    }
  }

  // Check if any transcriptions were generated
  if (transcriptions.length === 0) {
    logger(`No transcriptions were generated for session: ${sessionName}`, 'warn');
    return { summary: null, transcriptionFile: null };
  }

  // Aggregate and format transcriptions
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
        // Delete the WAV files after transcription if not needed
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
 * Parses the file name to extract the username.
 *
 * @param {string} fileName - The name of the file.
 * @returns {{username: string|null}} - The username.
 */
function parseFileName(fileName) {
  try {
    const baseName = path.basename(fileName, path.extname(fileName));
    const parts = baseName.split('_');
    if (parts.length < 4) {
      logger(`Invalid file name format: ${fileName}`, 'warn');
      return { username: null };
    }

    // Expected format: audio_username_userId_timestamp.wav
    const username = parts[1];

    return { username };
  } catch (error) {
    logger(`Error parsing file name ${fileName}: ${error.message}`, 'error');
    return { username: null };
  }
}

/**
 * Adjusts transcription segments based on system times.
 *
 * @param {Array} segments - The transcription segments.
 * @param {Object} timestampsData - The timestamps data from recording.
 * @param {string} username - The username of the speaker.
 * @param {Object} audioSettings - The audio settings used during recording.
 * @returns {Array} - The adjusted transcription segments.
 */
function adjustTranscriptionSegments(segments, timestampsData, username, audioSettings) {
  const { timestamps } = timestampsData;

  if (!timestamps || timestamps.length === 0) {
    logger(`No timestamps available for ${username}`, 'error');
    return [];
  }

  // Audio settings
  const sampleRate = parseInt(audioSettings.rate);
  const channels = parseInt(audioSettings.channels);
  const bytesPerSample = 2; // 16-bit audio (2 bytes per sample)
  const bytesPerSecond = sampleRate * channels * bytesPerSample;

  const adjustedSegments = segments.map((segment, index) => {
    // Calculate byte positions for segment start and end
    const startPosition = segment.start * bytesPerSecond;
    const endPosition = segment.end * bytesPerSecond;

    // logger(`Mapping segment ${index + 1} for ${username}: StartPosition=${startPosition}, EndPosition=${endPosition}`, 'debug');

    // Map positions to system times
    const wallClockStartTime = mapPositionToWallClockTime(startPosition, timestamps);
    const wallClockEndTime = mapPositionToWallClockTime(endPosition, timestamps);

    if (wallClockStartTime && wallClockEndTime) {
      // logger(`Mapped times for segment ${index + 1} of ${username}: Start=${wallClockStartTime}, End=${wallClockEndTime}`, 'debug');
      return {
        start: DateTime.fromMillis(wallClockStartTime),
        end: DateTime.fromMillis(wallClockEndTime),
        username: username,
        text: segment.text.trim(),
      };
    } else {
      logger(`Could not map positions to system times for ${username} in segment ${index + 1}`, 'warn');
      return null;
    }
  });

  // Filter out any null entries
  return adjustedSegments.filter(Boolean);
}

/**
 * Maps a byte position to system time using recorded timestamps.
 *
 * @param {number} position - The byte position in the audio file.
 * @param {Array} timestamps - The recorded timestamps with positions.
 * @returns {number|null} - The corresponding system time in milliseconds.
 */
function mapPositionToWallClockTime(position, timestamps) {
  // Find the two timestamp entries surrounding the position
  for (let i = 1; i < timestamps.length; i++) {
    const prevEntry = timestamps[i - 1];
    const currentEntry = timestamps[i];

    if (position >= prevEntry.position && position <= currentEntry.position) {
      // Linear interpolation between the two positions
      const ratio =
        (position - prevEntry.position) /
        (currentEntry.position - prevEntry.position);
      const timeDiff = currentEntry.time - prevEntry.time;
      const mappedTime = prevEntry.time + ratio * timeDiff;

      // logger(`Mapping position=${position} between positions=${prevEntry.position} and ${currentEntry.position} to time=${mappedTime}`, 'debug');

      return mappedTime;
    }
  }

  // If position is before the first timestamp
  if (position < timestamps[0].position) {
    // logger(`Position=${position} is before the first timestamp. Mapping to first time=${timestamps[0].time}`, 'debug');
    return timestamps[0].time;
  }

  // If position is after the last timestamp
  if (position > timestamps[timestamps.length - 1].position) {
    // logger(`Position=${position} is after the last timestamp. Mapping to last time=${timestamps[timestamps.length - 1].time}`, 'debug');
    return timestamps[timestamps.length - 1].time;
  }

  logger(`Position=${position} could not be mapped.`, 'debug');
  return null; // Position could not be mapped
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

  logger(`Transcriptions sorted by start time.`, 'verbose');

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