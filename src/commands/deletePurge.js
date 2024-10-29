import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getDirName } from '../utils/common.js';

// Define directories for recordings and transcripts
const recordingsDir = path.join(getDirName(), '../../bin/recordings');
const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

/**
 * Deletes a specific session, removing both its recordings and transcripts.
 *
 * @param {Object} interaction - The Discord interaction containing the command details.
 */
export async function deleteSessionHandler(interaction) {
  try {
    // Retrieve the session name provided by the user
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a valid session name to delete.');
      return;
    }

    // Define paths to the session's recording and transcript directories
    const sessionRecordingDir = path.join(recordingsDir, sessionName);
    const sessionTranscriptDir = path.join(transcriptsDir, sessionName);

    // Check if the session directories exist
    if (!fs.existsSync(sessionRecordingDir) && !fs.existsSync(sessionTranscriptDir)) {
      await interaction.reply(`No session named "${sessionName}" found.`);
      return;
    }

    // Delete the session's recording directory if it exists
    if (fs.existsSync(sessionRecordingDir)) {
      fs.rmSync(sessionRecordingDir, { recursive: true, force: true });
    }

    // Delete the session's transcript directory if it exists
    if (fs.existsSync(sessionTranscriptDir)) {
      fs.rmSync(sessionTranscriptDir, { recursive: true, force: true });
    }

    // Notify the user of successful deletion
    await interaction.reply(`The session "${sessionName}" has been deleted successfully.`);
  } catch (error) {
    // Log any errors encountered during deletion
    logger('Error deleting session:', 'error');
    await interaction.reply('An error occurred while attempting to delete the session.');
  }
}

/**
 * Purges all sessions by deleting all recordings and transcripts.
 * Requires user confirmation to prevent accidental deletion.
 *
 * @param {Object} interaction - The Discord interaction containing the command details.
 */
export async function purgeHandler(interaction) {
  try {
    // Retrieve the confirmation input from the user
    const confirmation = interaction.options.getString('confirmation');
    if (!confirmation) {
      await interaction.reply('Confirmation is required to proceed with purging all sessions.');
      return;
    }

    // Verify confirmation is 'y' to proceed with purge; otherwise, cancel
    if (confirmation.toLowerCase() !== 'y') {
      await interaction.reply('Purge canceled. No sessions were deleted.');
      return;
    }

    // Loop through both directories (recordings and transcripts) and delete all folders inside
    [transcriptsDir, recordingsDir].forEach((dir) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((folder) => {
          const fullPath = path.join(dir, folder);
          fs.rmSync(fullPath, { recursive: true, force: true });
        });
      }
    });

    // Notify the user that all sessions have been purged
    await interaction.reply('All sessions have been purged successfully.');
  } catch (error) {
    // Log any errors encountered during the purge
    logger('Error purging sessions:', 'error');
    await interaction.reply('An error occurred while purging all sessions.');
  }
}