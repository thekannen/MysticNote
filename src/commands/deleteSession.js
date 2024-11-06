import fs from 'fs';
import path from 'path';
import { SlashCommandBuilder } from 'discord.js';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

/**
 * Data for the 'delete_session' command.
 */
export const data = new SlashCommandBuilder()
  .setName('delete_session')
  .setDescription('Deletes a specific scrying session from the archives.')
  .addStringOption((option) =>
    option
      .setName('session')
      .setDescription('The name of the session to delete')
      .setRequired(true)
  );

/**
 * Executes the 'delete_session' command.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 */
export async function execute(interaction) {
  try {
    // Retrieve the session name provided by the user
    const sessionName = interaction.options.getString('session');

    // Validate the session name
    if (!sessionName || sessionName.trim() === '') {
      await interaction.reply({
        content: 'Please provide a valid session name to delete.',
        ephemeral: true,
      });
      logger('No session name provided or session name is invalid.', 'verbose');
      return;
    }

    // Define directories for recordings and transcripts
    const recordingsDir = path.join(getDirName(), '../../bin/recordings');
    const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

    // Define paths to the session's recording and transcript directories
    const sessionRecordingDir = path.join(recordingsDir, sessionName);
    const sessionTranscriptDir = path.join(transcriptsDir, sessionName);

    // Check if the session directories exist
    if (!fs.existsSync(sessionRecordingDir) && !fs.existsSync(sessionTranscriptDir)) {
      await interaction.reply({
        content: `No session named "${sessionName}" found.`,
        ephemeral: true,
      });
      logger(`No session named "${sessionName}" found.`, 'verbose');
      return;
    }

    // Delete the session's recording directory if it exists
    if (fs.existsSync(sessionRecordingDir)) {
      fs.rmSync(sessionRecordingDir, { recursive: true, force: true });
      logger(`Deleted recordings for session "${sessionName}".`, 'info');
    }

    // Delete the session's transcript directory if it exists
    if (fs.existsSync(sessionTranscriptDir)) {
      fs.rmSync(sessionTranscriptDir, { recursive: true, force: true });
      logger(`Deleted transcripts for session "${sessionName}".`, 'info');
    }

    // Notify the user of successful deletion
    await interaction.reply({
      content: `The session "${sessionName}" has been deleted successfully.`,
      ephemeral: true,
    });
    logger(`The session "${sessionName}" has been deleted successfully.`, 'verbose');
  } catch (error) {
    // Log any errors encountered during deletion
    logger(`Error deleting session: ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');
    await interaction.reply({
      content: 'An error occurred while attempting to delete the session.',
      ephemeral: true,
    });
  }
}
