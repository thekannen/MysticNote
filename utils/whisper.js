import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { generateTimestamp } from '../utils.js';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Date formatter for consistent server-local time
const localDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

// Transcribes all audio files in a session folder and saves the transcriptions
export async function transcribeAndSaveSessionFolder(sessionName) {
  const sessionFolderPath = path.join(__dirname, '../recordings', sessionName);
  if (!fs.existsSync(sessionFolderPath)) {
    logger(`Session folder not found: ${sessionFolderPath}`, 'error');
    return { summary: null, transcriptionFile: null };
  }

  const sessionFiles = fs.readdirSync(sessionFolderPath).filter(file => file.endsWith('.wav'));
  logger(`Transcribing session files from folder: ${sessionFolderPath}`, 'info');

  const sessionTranscriptsDir = path.join(__dirname, '../transcripts', sessionName);
  if (!fs.existsSync(sessionTranscriptsDir)) {
    fs.mkdirSync(sessionTranscriptsDir, { recursive: true });
  }

  let transcriptions = [];

  for (const file of sessionFiles) {
    const filePath = path.join(sessionFolderPath, file);
    const username = path.basename(file).split('_')[1];
    const fileCreationTime = fs.statSync(filePath).birthtime; // Capture file creation time as starting timestamp

    logger(`Transcribing ${filePath} for ${username}`, 'info');

    // Run the Python Whisper script and retrieve segments with relative timestamps
    const transcriptionSegments = await transcribeFileWithWhisper(filePath, username);
    if (transcriptionSegments) {
      // Adjust segment timestamps based on file creation time
      transcriptions.push(...transcriptionSegments.map(segment => ({
        start: new Date(fileCreationTime.getTime() + segment.start * 1000),
        end: new Date(fileCreationTime.getTime() + segment.end * 1000),
        username,
        text: segment.text
      })));
    } else {
      logger(`Transcription failed for file ${filePath}`, 'error');
    }
  }

  // Sort all segments by their actual start time
  transcriptions.sort((a, b) => a.start - b.start);

  // Format the transcription into a readable log with server-local timestamps
  const combinedTranscription = transcriptions.map(entry => {
    const start = localDateFormatter.format(entry.start);
    const end = localDateFormatter.format(entry.end);
    return `[${start} - ${end}] ${entry.username}: ${entry.text}`;
  }).join('\n\n');

  const finalFilePath = path.join(sessionTranscriptsDir, `full_conversation_log_${generateTimestamp().replace(/[:.]/g, '-')}.txt`);
  fs.writeFileSync(finalFilePath, combinedTranscription);

  logger(`Full transcription saved as ${finalFilePath}`, 'info');
  const summary = await generateSummary(combinedTranscription, sessionName);
  return { summary, transcriptionFile: finalFilePath };
}

// Runs the Python Whisper script to transcribe an audio file
async function transcribeFileWithWhisper(filePath, username) {
  const pythonScript = path.join(__dirname, 'whisper_transcribe.py');

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

// Generates a summary from the combined transcription text and saves it to a text file
export async function generateSummary(transcriptionText, sessionName) {
  const prompt = `
    Here is a conversation transcript. Please summarize the conversation, ignoring any background noise, music, or non-speech sounds. Focus only on the spoken content and relevant dialog.

    Transcript:
    ${transcriptionText}

    Summary:
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      const summary = data.choices[0].message.content.trim();
      logger(`Summary generated: ${summary}`, 'info');

      // Define the path for the summary file with server-local timestamp
      const sessionTranscriptsDir = path.join(transcriptsDir, sessionName);
      logger(`Checking if directory exists: ${sessionTranscriptsDir}`, 'debug');
      if (!fs.existsSync(sessionTranscriptsDir)) {
        logger(`Directory does not exist, creating directory: ${sessionTranscriptsDir}`, 'debug');
        fs.mkdirSync(sessionTranscriptsDir, { recursive: true });
      }

      const localTimestamp = localDateFormatter.format(new Date()).replace(/[/, :]/g, '-');
      const summaryFilePath = path.join(sessionTranscriptsDir, `summary_${sessionName}_${localTimestamp}.txt`);
      logger(`Writing summary to file: ${summaryFilePath}`, 'debug');
      fs.writeFileSync(summaryFilePath, summary);
      logger(`Summary successfully saved to ${summaryFilePath}`, 'info');

      return summary;
    } else {
      logger('No summary available.', 'error');
      return 'No summary available';
    }
  } catch (error) {
    logger(`Failed to generate summary: ${error.message}`, 'error');
    return 'Summary generation failed';
  }
}