import fs from 'fs';
import path from 'path';
import { SlashCommandBuilder } from 'discord.js';
import { getDirName } from '../utils/common.js';
import { logger, verboseLog } from '../utils/logger.js';

/**
 * Data for the 'purge' command.
 */
export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Deletes all scrying sessions from the archives.')
  .addStringOption((option) =>
    option
      .setName('confirmation')
      .setDescription('Type "CONFIRM" to proceed with purging all sessions')
      .setRequired(true)
  );

/**
 * Executes the 'purge' command.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 */
export async function execute(interaction) {
  try {
    // Retrieve the confirmation input from the user
    const confirmation = interaction.options.getString('confirmation');

    // Verify confirmation is 'CONFIRM' to proceed with purge; otherwise, cancel
    if (confirmation !== 'CONFIRM') {
      await interaction.reply({
        content: 'Purge canceled. No sessions were deleted.',
        ephemeral: true,
      });
      verboseLog('Purge canceled. No sessions were deleted.');
      return;
    }

    // Define directories for recordings and transcripts
    const recordingsDir = path.join(getDirName(), '../../bin/recordings');
    const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

    // Loop through both directories (recordings and transcripts) and delete all folders inside
    [transcriptsDir, recordingsDir].forEach((dir) => {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((folder) => {
          const fullPath = path.join(dir, folder);
          fs.rmSync(fullPath, { recursive: true, force: true });
          logger(`Deleted folder "${fullPath}".`, 'info');
        });
      }
    });

    // Notify the user that all sessions have been purged
    await interaction.reply({
      content: 'All sessions have been purged successfully.',
      ephemeral: true,
    });
    verboseLog('All sessions have been purged successfully.');
  } catch (error) {
    // Log any errors encountered during the purge
    logger(`Error purging sessions: ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');
    await interaction.reply({
      content: 'An error occurred while purging all sessions.',
      ephemeral: true,
    });
  }
}
