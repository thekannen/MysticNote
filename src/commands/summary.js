import fs from 'fs';
import path from 'path';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

// Define the directory where transcripts are stored
const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

/**
 * Retrieves and displays the most recent summary for a given session.
 *
 * @param {Object} interaction - The Discord interaction containing the command details.
 */
export async function revealSummary(interaction) {
  try {
    // Get the session name from the user's input
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a session name to summarize.');
      return;
    }

    // Construct the path to the session's transcript directory
    const sessionTranscriptDir = path.join(transcriptsDir, sessionName);
    if (!fs.existsSync(sessionTranscriptDir)) {
      await interaction.reply(`No session named "${sessionName}" found.`);
      return;
    }

    // Get all files in the directory with the prefix 'summary_'
    const summaryFiles = fs.readdirSync(sessionTranscriptDir)
      .filter(file => file.startsWith('summary_') && file.endsWith('.txt'));

    if (summaryFiles.length === 0) {
      await interaction.reply('No summary found for the specified session.');
      return;
    }

    // Sort summary files by modification time to get the latest summary
    const latestSummaryFile = summaryFiles
      .map(file => ({ file, time: fs.statSync(path.join(sessionTranscriptDir, file)).mtime }))
      .sort((a, b) => b.time - a.time)[0].file;

    // Read the content of the most recent summary file
    const summaryFilePath = path.join(sessionTranscriptDir, latestSummaryFile);
    const summaryText = fs.readFileSync(summaryFilePath, 'utf-8');

    // Send the summary content back to the user, if available
    if (summaryText) {
      await interaction.reply(`A brief vision appears… Here is the essence of what was revealed:\n\n${summaryText}`);
    } else {
      await interaction.reply('Unable to reveal the summary of the vision.');
    }
  } catch (error) {
    // Log and notify user if an error occurs
    logger('Error revealing summary:', 'error');
    await interaction.reply('An error occurred while attempting to reveal the summary.');
  }
}

/**
 * Retrieves and displays the full transcription for a given session.
 *
 * @param {Object} interaction - The Discord interaction containing the command details.
 */
export async function retrieveFullTranscription(interaction) {
  try {
    // Get the session name from the user's input
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a session name to retrieve the transcription.');
      return;
    }

    // Construct the path to the session's transcript directory
    const sessionTranscriptDir = path.join(transcriptsDir, sessionName);
    if (!fs.existsSync(sessionTranscriptDir)) {
      await interaction.reply(`No session named "${sessionName}" found.`);
      return;
    }

    // Get all files in the directory with the prefix 'full_'
    const fullTranscriptFiles = fs.readdirSync(sessionTranscriptDir)
      .filter(file => file.startsWith('full_') && file.endsWith('.txt'));

    if (fullTranscriptFiles.length === 0) {
      await interaction.reply('No full transcription found for the specified session.');
      return;
    }

    // Sort full transcription files by modification time to get the latest transcription
    const latestFullTranscriptFile = fullTranscriptFiles
      .map(file => ({ file, time: fs.statSync(path.join(sessionTranscriptDir, file)).mtime }))
      .sort((a, b) => b.time - a.time)[0].file;

    // Read the content of the most recent full transcription file
    const fullTranscriptFilePath = path.join(sessionTranscriptDir, latestFullTranscriptFile);
    const transcriptionText = fs.readFileSync(fullTranscriptFilePath, 'utf-8');

    // Send the full transcription content back to the user, if available
    if (transcriptionText) {
      await interaction.reply(`The orb reveals every word it has transcribed… the complete vision awaits:\n\n${transcriptionText}`);
    } else {
      await interaction.reply('Unable to retrieve the full transcription.');
    }
  } catch (error) {
    // Log and notify user if an error occurs
    logger('Error retrieving full transcription:', 'error');
    await interaction.reply('An error occurred while attempting to retrieve the full transcription.');
  }
}