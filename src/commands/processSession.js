import { SlashCommandBuilder } from 'discord.js';
import { transcribeAndSaveSessionFolder } from '../services/transcriptionService.js';
import { setSessionName, setScryingSessionActive } from '../services/recordingService.js';
import { logger } from '../utils/logger.js';

/**
 * Data for the 'process_session' command.
 */
export const data = new SlashCommandBuilder()
  .setName('process_session')
  .setDescription('Reprocesses a previous scrying session for transcription and summarization.')
  .addStringOption((option) =>
    option
      .setName('session')
      .setDescription('The name of the session to reprocess')
      .setRequired(true)
  );

/**
 * Executes the 'process_session' command.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 */
export async function execute(interaction) {
  try {
    const sessionName = interaction.options.getString('session');
    if (!sessionName || sessionName.trim() === '') {
      await interaction.reply({
        content: 'Please provide a valid session name to reprocess.',
        ephemeral: true,
      });
      logger('No session name provided for reprocessing.', 'verbose');
      return;
    }

    // Notify the user about transcription starting and update logs
    await interaction.reply({
      content: `Starting transcription and summarization for session: "${sessionName}"`,
      ephemeral: false,
    });
    logger(`Reprocessing session: ${sessionName}`, 'info');

    // Clear session state and disable scrying to avoid overlap
    setScryingSessionActive(false);
    setSessionName(null);

    // Transcribe and summarize the session
    const { summary, transcriptionFile } = await transcribeAndSaveSessionFolder(sessionName);

    // Provide feedback on completion or failure
    if (summary) {
      await interaction.editReply({
        content: `The orb dims, and the vision is now sealed in writing…\n\n${summary}`,
      });
      logger(`Transcription successfully saved to ${transcriptionFile}`, 'info');
    } else {
      await interaction.editReply({
        content: 'Transcription or summary generation failed.',
      });
      logger('Failed to generate transcription or summary.', 'error');
    }
  } catch (error) {
    logger(`Error during process_session command: ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');
    await interaction.editReply({
      content: 'An error occurred while processing the transcription and summary.',
    });
  }
}