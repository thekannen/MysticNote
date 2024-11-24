import { SlashCommandBuilder } from 'discord.js';
import { endScryingCore } from '../services/endScryingCore.js';
import { getSessionName, setScryingSessionActive } from '../services/recordingService.js';
import { logger } from '../utils/logger.js';

/**
 * Data for the 'end_scrying' command.
 */
export const data = new SlashCommandBuilder()
  .setName('end_scrying')
  .setDescription('Stops the scrying session and processes the transcription.');

/**
 * Executes the 'end_scrying' command.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 */
export async function execute(interaction) {
  try {
    const channel = interaction.channel;

    if (!channel) {
      logger(`Channel not found. Unable to proceed with transcription.`, 'error');
      await interaction.reply({
        content: 'An error occurred: Channel not found.',
        ephemeral: true,
      });
      return;
    }

    const sessionName = getSessionName();
    if (!sessionName) {
      const message = 'No active scrying session found. Please start a session first.';
      await interaction.reply({ content: message, ephemeral: true });
      logger('No active scrying session found. Please start a session first.', 'verbose');
      setScryingSessionActive(false);
      return;
    }

    const notification = 'Stopping the scrying and processing the vision… This may take a while. Please remain patient.';
    await interaction.reply({ content: notification, ephemeral: false });
    logger('Stopping recording and processing transcription...', 'info');

    // Call the core function
    await endScryingCore(channel);

  } catch (error) {
    const errorMessage = 'An error occurred while processing the transcription and summary.';
    logger(`Error during end_scrying command: ${error.message}\n${error.stack}`, 'error');
    try {
      await interaction.editReply({ content: errorMessage });
    } catch (editError) {
      logger(`Error editing reply: ${editError.message}`, 'error');
    }
  }
}
