import fs from 'fs';
import path from 'path';
import { generateSummary } from '../utils/whisper.js';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const transcriptsDir = path.join(__dirname, '../transcripts');

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

    // Find all files with the prefix 'summary_'
    const summaryFiles = fs.readdirSync(sessionTranscriptDir)
      .filter(file => file.startsWith('summary_') && file.endsWith('.txt'));

    if (summaryFiles.length === 0) {
      await interaction.reply('No summary found for the specified session.');
      return;
    }

    // Sort summary files by modification time to get the most recent
    const latestSummaryFile = summaryFiles
      .map(file => ({ file, time: fs.statSync(path.join(sessionTranscriptDir, file)).mtime }))
      .sort((a, b) => b.time - a.time)[0].file;

    const summaryFilePath = path.join(sessionTranscriptDir, latestSummaryFile);
    const summaryText = fs.readFileSync(summaryFilePath, 'utf-8');

    if (summaryText) {
      await interaction.reply(`A brief vision appears… Here is the essence of what was revealed:\n\n${summaryText}`);
    } else {
      await interaction.reply('Unable to reveal the summary of the vision.');
    }
  } catch (error) {
    logger('Error revealing summary:', 'error');
    await interaction.reply('An error occurred while attempting to reveal the summary.');
  }
}

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

    // Find all files with the prefix 'full_'
    const fullTranscriptFiles = fs.readdirSync(sessionTranscriptDir)
      .filter(file => file.startsWith('full_') && file.endsWith('.txt'));

    if (fullTranscriptFiles.length === 0) {
      await interaction.reply('No full transcription found for the specified session.');
      return;
    }

    // Sort full transcription files by modification time to get the most recent
    const latestFullTranscriptFile = fullTranscriptFiles
      .map(file => ({ file, time: fs.statSync(path.join(sessionTranscriptDir, file)).mtime }))
      .sort((a, b) => b.time - a.time)[0].file;

    const fullTranscriptFilePath = path.join(sessionTranscriptDir, latestFullTranscriptFile);
    const transcriptionText = fs.readFileSync(fullTranscriptFilePath, 'utf-8');

    if (transcriptionText) {
      await interaction.reply(`The orb reveals every word it has transcribed… the complete vision awaits:\n\n${transcriptionText}`);
    } else {
      await interaction.reply('Unable to retrieve the full transcription.');
    }
  } catch (error) {
    logger('Error retrieving full transcription:', 'error');
    await interaction.reply('An error occurred while attempting to retrieve the full transcription.');
  }
}