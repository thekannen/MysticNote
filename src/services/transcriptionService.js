import fs from 'fs';
import path from 'path';
import { transcribeFileWithWhisper } from './whisperService.js';
import { generateSummary } from './summaryService.js';
import { generateTimestamp } from '../../utils.js';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');
const recordingsDir = path.join(getDirName(), '../../bin/recordings');
const localDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const localOffsetMs = new Date().getTimezoneOffset() * -60000;

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
  }

  let transcriptions = [];

  // Loop through each file, transcribing and adding timestamps
  for (const file of sessionFiles) {
    const filePath = path.join(sessionFolderPath, file);
    const username = path.basename(file).split('_')[1];
    const fileCreationTime = fs.statSync(filePath).birthtime;

    const transcriptionSegments = await transcribeFileWithWhisper(filePath, username);
    if (transcriptionSegments) {
      transcriptions.push(...transcriptionSegments.map(segment => ({
        start: new Date(fileCreationTime.getTime() + segment.start * 1000 + localOffsetMs),
        end: new Date(fileCreationTime.getTime() + segment.end * 1000 + localOffsetMs),
        username,
        text: segment.text
      })));
    }
  }

  const aggregatedTranscriptions = aggregateTranscriptions(transcriptions);
  const combinedTranscription = formatTranscription(aggregatedTranscriptions);

  const finalFilePath = path.join(sessionTranscriptsDir, `full_conversation_log_${generateTimestamp().replace(/[:.]/g, '-')}.txt`);
  fs.writeFileSync(finalFilePath, combinedTranscription);

  logger(`Full transcription saved as ${finalFilePath}`, 'info');

  // Generate a summary using the SummaryService
  const summary = await generateSummary(combinedTranscription, sessionName);
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
      }
      currentSpeaker = segment.username;
      currentText = segment.text;
      currentStart = segment.start;
      currentEnd = segment.end;
    }
    if (index === transcriptions.length - 1) {
      aggregatedTranscriptions.push({ start: currentStart, end: currentEnd, username: currentSpeaker, text: currentText.trim() });
    }
  });
  return aggregatedTranscriptions;
}

// Helper to format transcription entries for readability
function formatTranscription(transcriptions) {
  return transcriptions.map(entry => {
    const start = localDateFormatter.format(entry.start);
    const end = localDateFormatter.format(entry.end);
    return `[${start} - ${end}] ${entry.username}: ${entry.text}`;
  }).join('\n\n');
}