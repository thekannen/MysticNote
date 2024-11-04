import { transcribeAndSaveSessionFolder } from '../services/transcriptionService.js';
import { setSessionName, setScryingSessionActive } from '../services/recordingService.js';
import { logger, verboseLog } from '../utils/logger.js';

/**
 * Processes transcription and sends the result to the specified channel.
 *
 * @param {Object} interaction - Discord interaction containing user command details (if any).
 * @param {Object} channelExt - Optional external channel to send messages if interaction is not provided.
 */
export async function processSessionHandler(interaction) {
  try {
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a valid session name to reprocess.');
      verboseLog('Please provide a valid session name to reprocess.');
      return;
    }

    // Notify the user about transcription starting and update logs
    await interaction.reply(`Starting transcription and summarization for session: ${sessionName}`);
    logger(`Reprocessing session: ${sessionName}`, 'info');

    // Clear session state and disable scrying to avoid overlap
    setScryingSessionActive(false);
    setSessionName(null);

    // Transcribe and summarize the session
    const { summary, transcriptionFile } = await transcribeAndSaveSessionFolder(sessionName);

    // Provide feedback on completion or failure
    if (summary) {
      await interaction.editReply(`The orb dims, and the vision is now sealed in writing…\n\n${summary}`);
      logger(`Transcription successfully saved to ${transcriptionFile}`, 'info');
    } else {
      await interaction.editReply('Transcription or summary generation failed.');
      logger('Failed to generate transcription or summary.', 'error');
    }
  } catch (error) {
    logger(`Error during transcription process: ${error.message}`, 'error');
    await interaction.editReply('An error occurred while processing the transcription and summary.');
  }
}