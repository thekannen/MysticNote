import fs from 'fs';
import path from 'path';
import { transcribeFileWithWhisper } from './whisperService.js';
import { generateSummary } from './summaryService.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import { logger, verboseLog } from '../utils/logger.js';
import config from '../config/config.js';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');
const recordingsDir = path.join(getDirName(), '../../bin/recordings');

// Function to transcribe all audio files in a session folder and save the transcriptions
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

    // Extract the timestamp from the filename
    const timestampString = path.basename(file).split('_').slice(-1)[0].replace('.wav', '');
    const fileStartTime = new Date(timestampString.replace(/-/g, ':').replace('T', ' '));

    verboseLog(`Starting transcription for file: ${filePath}, starting at: ${fileStartTime}`);

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

  // If saveRecordings is set to false, delete the recordings after generating the summary
  if (summary && !config.saveRecordings) {
    for (const file of sessionFiles) {
      const filePath = path.join(sessionFolderPath, file);
      fs.unlinkSync(filePath);
      logger(`Deleted recording file: ${filePath}`, 'info');
    }
  }

  return { summary, transcriptionFile: finalFilePath };
}

// Helper to aggregate transcription segments
function aggregateTranscriptions(transcriptions) {
  const BUFFER_MS = 500;
  transcriptions.sort((a, b) => a.start - b.start);

  const aggregatedTranscriptions = [];
  let currentSpeaker = null;
  let currentText = "";
  let currentStart = null;
  let currentEnd = null;

  transcriptions.forEach((segment, index) => {
    if (segment.username === currentSpeaker && segment.start - currentEnd < BUFFER_MS) {
      currentText += " " + segment.text;
      currentEnd = segment.end;
    } else {
      if (currentSpeaker) {
        aggregatedTranscriptions.push({ start: currentStart, end: currentEnd, username: currentSpeaker, text: currentText.trim() });
        verboseLog(`Aggregated transcription for ${currentSpeaker} from ${currentStart} to ${currentEnd}`);
      }
      currentSpeaker = segment.username;
      currentText = segment.text;
      currentStart = segment.start;
      currentEnd = segment.end;
    }
    if (index === transcriptions.length - 1) {
      aggregatedTranscriptions.push({ start: currentStart, end: currentEnd, username: currentSpeaker, text: currentText.trim() });
      verboseLog(`Final aggregated transcription for ${currentSpeaker} from ${currentStart} to ${currentEnd}`);
    }
  });
  return aggregatedTranscriptions;
}

// Helper to format transcription entries for readability
function formatTranscription(transcriptions) {
  return transcriptions.map(entry => {
    const start = entry.start.toLocaleString();
    const end = entry.end.toLocaleString();
    return `[${start} - ${end}] ${entry.username}: ${entry.text}`;
  }).join('\n\n');
}