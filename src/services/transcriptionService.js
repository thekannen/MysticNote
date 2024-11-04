import fs from 'fs';
import path from 'path';
import { transcribeFileWithWhisper } from './whisperService.js';
import { generateSummary } from './summaryService.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import { logger, verboseLog } from '../utils/logger.js';
import config from '../config/config.js';

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

export async function transcribeAndSaveSessionFolder(sessionName) {
  const sessionFolderPath = path.join(recordingsDir, sessionName);

  if (!fs.existsSync(sessionFolderPath)) {
    logger(`Session folder not found: ${sessionFolderPath}`, 'error');
    return { summary: null, transcriptionFile: null };
  }

  const sessionFiles = fs.readdirSync(sessionFolderPath).filter(file => file.endsWith('.wav'));
  const sessionTranscriptsDir = path.join(transcriptsDir, sessionName);
  if (!fs.existsSync(sessionTranscriptsDir)) {
    fs.mkdirSync(sessionTranscriptsDir, { recursive: true });
    verboseLog(`Created directory for transcripts: ${sessionTranscriptsDir}`);
  }

  let transcriptions = [];

  for (const file of sessionFiles) {
    const filePath = path.join(sessionFolderPath, file);
    const username = path.basename(file).split('_')[1];

    // Track this user as an attendee
    addAttendee(username);

    // Extract timestamp from filename and format it correctly
    const fileTimestamp = path.basename(file, path.extname(file)).split('_').pop();
    const formattedTimestamp = fileTimestamp.replace('T', ' ').replace(/-/g, ':').replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const fileStartTime = new Date(formattedTimestamp);

    if (isNaN(fileStartTime.getTime())) {
        logger(`Invalid date format in filename: ${file}`, 'err');
        continue;
    }

    const transcriptionSegments = await transcribeFileWithWhisper(filePath, username);
    if (transcriptionSegments) {
        transcriptions.push(...transcriptionSegments.map(segment => ({
            start: new Date(fileStartTime.getTime() + segment.start * 1000),
            end: new Date(fileStartTime.getTime() + segment.end * 1000),
            username,
            text: segment.text
        })));
        verboseLog(`Transcription segments added for ${username} from file: ${filePath}`);
    } else {
        verboseLog(`No transcription segments found for ${filePath}`, 'warn');
    }
}

  const aggregatedTranscriptions = aggregateTranscriptions(transcriptions);
  const combinedTranscription = formatTranscription(aggregatedTranscriptions);

  const finalFilePath = path.join(sessionTranscriptsDir, `full_conversation_log_${generateTimestamp().replace(/[: ]/g, '-')}.txt`);
  fs.writeFileSync(finalFilePath, combinedTranscription);

  logger(`Full transcription saved as ${finalFilePath}`, 'info');

  const summary = await generateSummary(combinedTranscription, sessionName);

  if (summary && !config.saveRecordings) {
    for (const file of sessionFiles) {
      const filePath = path.join(sessionFolderPath, file);
      fs.unlinkSync(filePath);
      logger(`Deleted recording file: ${filePath}`, 'info');
    }
  }

  return { summary, transcriptionFile: finalFilePath };
}

// Helper to aggregate transcription segments from multiple users in chronological order
function aggregateTranscriptions(transcriptions) {
  // Sort all transcription segments by start time
  transcriptions.sort((a, b) => a.start - b.start);

  // Map each segment to a formatted entry without merging
  return transcriptions.map(segment => ({
    start: segment.start,
    end: segment.end,
    username: segment.username,
    text: segment.text.trim()
  }));
}

// Helper to format transcription entries for readability
function formatTranscription(transcriptions) {
  return transcriptions.map(entry => {
    const start = entry.start.toLocaleString();
    const end = entry.end.toLocaleString();
    return `[${start} - ${end}] ${entry.username}: ${entry.text}`;
  }).join('\n'); // Join each entry with a newline for separate lines
}
