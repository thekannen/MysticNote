import { SlashCommandBuilder } from 'discord.js';
import {
  transcribeAndSaveSessionFolder,
} from '../services/transcriptionService.js';
import {
  stopRecording,
  getSessionName,
  setScryingSessionActive,
  setSessionName,
} from '../services/recordingService.js';
import { clearInactivityTimer } from '../utils/timers.js';
import { logger, verboseLog } from '../utils/logger.js';

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
      verboseLog('No active scrying session found. Please start a session first.');
      setScryingSessionActive(false);
      return;
    }

    const notification = 'Stopping the scrying and processing the vision… This may take a while. Please remain patient.';
    await interaction.reply({ content: notification, ephemeral: false });
    logger('Stopping recording and processing transcription...', 'info');

    // Stop all active recordings and clear inactivity timer immediately
    await stopRecording();
    clearInactivityTimer();

    const { summary, transcriptionFile } = await transcribeAndSaveSessionFolder(sessionName);

    if (summary) {
      const successMessage = `The orb dims, and the vision is now sealed in writing…\n\n${summary}`;
      await interaction.editReply({ content: successMessage });
      logger(`Transcription saved to ${transcriptionFile}`, 'info');
    } else {
      const failureMessage = 'Transcription or summary failed.';
      await interaction.editReply({ content: failureMessage });
      logger(failureMessage, 'error');
    }
  } catch (error) {
    const errorMessage = 'An error occurred while processing the transcription and summary.';
    logger(`Error during end_scrying command: ${error.message}\n${error.stack}`, 'error');
    await interaction.editReply({ content: errorMessage });
  } finally {
    // Clear session state to prevent further recording attempts in this session
    setSessionName(null);
    setScryingSessionActive(false);
    verboseLog('Session state reset after transcription process.');
  }
}
