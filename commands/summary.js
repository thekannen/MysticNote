import fs from 'fs';
import path from 'path';
import { generateSummary } from '../utils/whisper.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Directory path for transcripts
const transcriptsDir = path.join(__dirname, '../transcripts');

// Reveal Summary
export async function revealSummary(interaction) {
  try {
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a session name to summarize.');
      return;
    }

    const sessionTranscriptDir = path.join(transcriptsDir, sessionName);
    if (!fs.existsSync(sessionTranscriptDir)) {
      await interaction.reply(`No session named "${sessionName}" found.`);
      return;
    }

    const files = fs.readdirSync(sessionTranscriptDir).filter(file => file.endsWith('.txt'));
    if (files.length === 0) {
      await interaction.reply('No transcripts found for the specified session.');
      return;
    }

    // Sort files by modification time and get the latest file
    const sortedFiles = files
      .map(file => ({ file, time: fs.statSync(path.join(sessionTranscriptDir, file)).mtime }))
      .sort((a, b) => b.time - a.time);

    const transcriptionFile = path.join(sessionTranscriptDir, sortedFiles[0].file);
    const transcriptionText = fs.readFileSync(transcriptionFile, 'utf-8');
    const summary = await generateSummary(transcriptionText);

    if (summary) {
      await interaction.reply(`A brief vision appears… Here is the essence of what was revealed:

${summary}`);
    } else {
      await interaction.reply('Unable to reveal the summary of the vision.');
    }
  } catch (error) {
    console.error('Error revealing summary:', error);
    await interaction.reply('An error occurred while attempting to reveal the summary.');
  }
}

// Retrieve Full Transcription
export async function retrieveFullTranscription(interaction) {
  try {
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a session name to retrieve the transcription.');
      return;
    }

    const sessionTranscriptDir = path.join(transcriptsDir, sessionName);
    if (!fs.existsSync(sessionTranscriptDir)) {
      await interaction.reply(`No session named "${sessionName}" found.`);
      return;
    }

    const files = fs.readdirSync(sessionTranscriptDir).filter(file => file.endsWith('.txt'));
    if (files.length === 0) {
      await interaction.reply('No transcripts found for the specified session.');
      return;
    }

    // Sort files by modification time and get the latest file
    const sortedFiles = files
      .map(file => ({ file, time: fs.statSync(path.join(sessionTranscriptDir, file)).mtime }))
      .sort((a, b) => b.time - a.time);

    const transcriptionFile = path.join(sessionTranscriptDir, sortedFiles[0].file);
    const transcriptionText = fs.readFileSync(transcriptionFile, 'utf-8');
    await interaction.reply(`The orb reveals every word it has transcribed… the complete vision awaits:

${transcriptionText}`);
  } catch (error) {
    console.error('Error retrieving full transcription:', error);
    await interaction.reply('An error occurred while attempting to retrieve the full transcription.');
  }
}
