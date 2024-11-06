import { transcribeAndSaveSessionFolder } from './transcriptionService.js';
import { stopRecording, getSessionName, setScryingSessionActive, setSessionName } from './recordingService.js';
import { logger } from '../utils/logger.js';

/**
 * Core function to end the scrying session.
 * @param {import('discord.js').TextChannel} channel - The Discord channel to send notifications.
 */
export async function endScryingCore(channel) {
  try {
    const sessionName = getSessionName();
    if (!sessionName) {
      const message = 'No active scrying session found. Please start a session first.';
      if (channel) {
        await channel.send(message);
      }
      logger(message, 'warn');
      setScryingSessionActive(false);
      return;
    }

    logger('Stopping recording and processing transcription...', 'verbose');

    // Stop all active recordings
    await stopRecording();

    // Process transcription
    const { summary, transcriptionFile } = await transcribeAndSaveSessionFolder(sessionName);

    if (summary && channel) {
      const successMessage = `The orb dims, and the vision is now sealed in writing…\n\n${summary}`;
      await channel.send(successMessage);
      logger(`Transcription saved to ${transcriptionFile}`, 'info');
    } else if (channel) {
      const failureMessage = 'Transcription or summary failed.';
      await channel.send(failureMessage);
      logger(failureMessage, 'error');
    }
  } catch (error) {
    const errorMessage = 'An error occurred while processing the transcription and summary.';
    logger(`Error in endScryingCore: ${error.message}\n${error.stack}`, 'error');
    if (channel) {
      await channel.send(errorMessage);
    }
  } finally {
    // Clear session state
    setSessionName(null);
    setScryingSessionActive(false);
    logger('Session state reset after transcription process.', 'verbose');
  }
}
