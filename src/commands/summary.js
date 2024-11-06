import fs from 'fs/promises';
import path from 'path';
import { SlashCommandBuilder } from 'discord.js';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

/**
 * Data for the 'reveal_summary' command.
 */
export const data = new SlashCommandBuilder()
  .setName('reveal_summary')
  .setDescription('Displays the most recent summary for a given scrying session.')
  .addStringOption((option) =>
    option
      .setName('session')
      .setDescription('The name of the session to retrieve the summary from')
      .setRequired(true)
  );

/**
 * Executes the 'reveal_summary' command.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 */
export async function execute(interaction) {
  try {
    // Get the session name from the user's input
    const sessionName = interaction.options.getString('session');

    if (!sessionName || sessionName.trim() === '') {
      await interaction.reply({
        content: 'Please provide a valid session name to summarize.',
        ephemeral: true,
      });
      logger('Invalid or empty session name provided for summary.', 'verbose');
      return;
    }

    // Sanitize session name to prevent directory traversal attacks
    const sanitizedSessionName = sessionName.replace(/[^a-zA-Z0-9-_]/g, '_');

    // Construct the path to the session's transcript directory
    const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');
    const sessionTranscriptDir = path.join(transcriptsDir, sanitizedSessionName);

    // Check if the session directory exists
    try {
      await fs.access(sessionTranscriptDir);
    } catch {
      await interaction.reply({
        content: `No session named "${sanitizedSessionName}" found.`,
        ephemeral: true,
      });
      logger(`No session named "${sanitizedSessionName}" found.`, 'verbose');
      return;
    }

    // Get all files in the directory with the prefix 'summary_'
    const files = await fs.readdir(sessionTranscriptDir);
    const summaryFiles = files.filter(
      (file) => file.startsWith('summary_') && file.endsWith('.txt')
    );

    if (summaryFiles.length === 0) {
      await interaction.reply({
        content: 'No summary found for the specified session.',
        ephemeral: true,
      });
      logger('No summary found for the specified session.', 'verbose');
      return;
    }

    // Sort summary files by modification time to get the latest summary
    const summaryFilesWithTime = await Promise.all(
      summaryFiles.map(async (file) => {
        const filePath = path.join(sessionTranscriptDir, file);
        const stats = await fs.stat(filePath);
        return { file, time: stats.mtime };
      })
    );

    summaryFilesWithTime.sort((a, b) => b.time - a.time);
    const latestSummaryFile = summaryFilesWithTime[0].file;

    // Read the content of the most recent summary file
    const summaryFilePath = path.join(sessionTranscriptDir, latestSummaryFile);
    const summaryText = await fs.readFile(summaryFilePath, 'utf-8');

    // Send the summary content back to the user, if available
    if (summaryText) {
      // Handle Discord's message length limit (2000 characters)
      if (summaryText.length > 2000) {
        // Send the summary as a file attachment
        await interaction.reply({
          content: 'The summary is too long to display here. Please find it attached.',
          files: [{ attachment: summaryFilePath, name: latestSummaryFile }],
          ephemeral: false,
        });
      } else {
        await interaction.reply({
          content: `A brief vision appears… Here is the essence of what was revealed:\n\n${summaryText}`,
          ephemeral: false,
        });
      }
      logger(`Displayed summary for session "${sanitizedSessionName}".`, 'verbose');
    } else {
      await interaction.reply({
        content: 'Unable to reveal the summary of the vision.',
        ephemeral: true,
      });
      logger('Unable to reveal the summary of the vision.', 'verbose');
    }
  } catch (error) {
    // Log and notify user if an error occurs
    logger(`Error revealing summary: ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');
    await interaction.reply({
      content: 'An error occurred while attempting to reveal the summary.',
      ephemeral: true,
    });
  }
}
