import { transcribeAndSaveSessionFolder } from '../services/transcriptionService.js';
import { stopRecording, getSessionName, setScryingSessionActive, setSessionName } from '../services/recordingService.js';
import { clearInactivityTimer } from '../utils/timers.js';
import { logger, verboseLog } from '../utils/logger.js';

/**
 * Stops all active recordings, processes transcription, and sends the result to the specified channel.
 *
 * @param {Object} interaction - Discord interaction containing user command details (if any).
 * @param {Object} channelExt - Optional external channel to send messages if interaction is not provided.
 */
export async function stopRecordingAndTranscribe(interaction, channelExt) {
  const channel = interaction?.channel || channelExt;

  if (!channel) {
    logger(`Channel not found. Unable to proceed with transcription.`, 'error');
    return;
  }

  try {
    const sessionName = getSessionName();
    if (!sessionName) {
      const message = 'No active scrying session found. Please start a session first.';
      interaction ? await interaction.reply(message) : await channel.send(message);
      verboseLog('No active scrying session found. Please start a session first.');
      setScryingSessionActive(false);
      return;
    }

    const notification = 'Stopping the scrying and processing the vision… This may take a while. Please remain patient and do not leave.';
    interaction ? await interaction.reply({ content: notification, ephemeral: false }) : await channel.send(notification);
    logger('Stopping recording and processing transcription...', 'info');

    // Stop all active recordings and clear inactivity timer immediately
    await stopRecording(); 
    clearInactivityTimer();

    const { summary, transcriptionFile } = await transcribeAndSaveSessionFolder(sessionName);

    if (summary) {
      const successMessage = `The orb dims, and the vision is now sealed in writing…\n\n${summary}`;
      interaction ? await interaction.editReply(successMessage) : await channel.send(successMessage);
      logger(`Transcription saved to ${transcriptionFile}`, 'info');
    } else {
      const failureMessage = 'Transcription or summary failed.';
      interaction ? await interaction.editReply(failureMessage) : await channel.send(failureMessage);
      logger(failureMessage, 'error');
    }
  } catch (error) {
    const errorMessage = 'An error occurred while processing the transcription and summary.';
    logger(`Error during stop and transcribe process: ${error.message}\n${error.stack}`, 'error');
    interaction ? await interaction.editReply(errorMessage) : await channel.send(errorMessage);
  } finally {
    // Clear session state to prevent further recording attempts in this session
    setSessionName(null);
    setScryingSessionActive(false);  
    verboseLog('Session state reset after transcription process.');
  }
}
