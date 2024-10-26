import fs from 'fs';
import path from 'path';
import { generateSummary } from '../utils/whisper.js';import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Directory path for transcripts
const transcriptsDir = path.join(__dirname, '../transcripts');

// Retrieve the latest transcription file
function getLatestTranscriptionFile() {
  const files = fs.readdirSync(transcriptsDir).filter(file => file.endsWith('.txt'));
  if (files.length === 0) return null;

  // Sort files by modification time and get the latest file
  const sortedFiles = files
    .map(file => ({ file, time: fs.statSync(path.join(transcriptsDir, file)).mtime }))
    .sort((a, b) => b.time - a.time);

  return path.join(transcriptsDir, sortedFiles[0].file);
}

// Reveal Summary
export async function revealSummary(interaction) {
  const transcriptionFile = getLatestTranscriptionFile();
  if (!transcriptionFile) {
    await interaction.reply('No recent scrying session found.');
    return;
  }

  const transcriptionText = fs.readFileSync(transcriptionFile, 'utf-8');
  const summary = await generateSummary(transcriptionText);

  if (summary) {
    await interaction.reply(`A brief vision appears… Here is the essence of what was revealed:\n\n${summary}`);
  } else {
    await interaction.reply('Unable to reveal the summary of the vision.');
  }
}

// Retrieve Full Transcription
export async function retrieveFullTranscription(interaction) {
  const transcriptionFile = getLatestTranscriptionFile();
  if (!transcriptionFile) {
    await interaction.reply('No recent scrying session found.');
    return;
  }

  const transcriptionText = fs.readFileSync(transcriptionFile, 'utf-8');
  await interaction.reply(`The orb reveals every word it has transcribed… the complete vision awaits:\n\n${transcriptionText}`);
}
