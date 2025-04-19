import fs from 'fs/promises';
import path from 'path';
import config from '../config/config.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import { logger } from '../utils/logger.js';
import { getAttendees } from './transcriptionService.js';
import { chunk } from '../summarizer/chunker.js';
import { mapSummary } from '../summarizer/mapper.js';
import { reduceSummaries } from '../summarizer/reducer.js';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

/**
 * Saves the final summary text to a file.
 */
async function saveSummaryToFile(sessionDir, sessionName, summary) {
  try {
    await fs.mkdir(sessionDir, { recursive: true });
    const timestamp = generateTimestamp().replace(/[: ]/g, '-');
    const summaryFile = path.join(sessionDir, `summary_${sessionName}_${timestamp}.txt`);
    await fs.writeFile(summaryFile, summary, 'utf8');
    logger(`Summary successfully saved to ${summaryFile}`, 'info');
  } catch (error) {
    logger(`Error saving summary file: ${error.message}`, 'error');
  }
}

/**
 * Generates a concise, speaker‑aware summary using map‑reduce.
 *
 * @param {string} transcriptionText - The full combined transcript.
 * @param {string} sessionName - Session identifier.
 * @returns {Promise<string>} - Final summary text with attendee list.
 */
export async function generateSummary(transcriptionText, sessionName) {
  // 1. Chunk transcript
  const chunks = chunk(transcriptionText, config.summarizer.chunkTokenSize);

  // 2. Map: summarize each chunk in parallel
  const partialSummaries = await Promise.all(
    chunks.map((text) => mapSummary(text))
  );

  // 3. Reduce: consolidate into final summary
  const coreSummary = await reduceSummaries(partialSummaries);

  // 4. Prepend attendees list
  const attendees = getAttendees();
  const attendeeLine = `Attendees: ${attendees.length > 0 ? attendees.join(', ') : 'None'}\n\n`;
  const fullSummary = attendeeLine + coreSummary;

  // 5. Save to file
  const sessionDir = path.join(transcriptsDir, sessionName);
  await saveSummaryToFile(sessionDir, sessionName, fullSummary);

  return fullSummary;
}