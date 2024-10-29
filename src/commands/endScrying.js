import { transcribeAndSaveSessionFolder } from '../services/transcriptionService.js';
import { stopRecording, getSessionName, setSessionName, setScryingSessionActive } from '../services/recordingService.js';
import { logger } from '../utils/logger.js';

/**
 * Stops all active recordings, processes transcription, and sends the result to the specified channel.
 *
 * @param {Object} interaction - Discord interaction containing user command details (if any).
 * @param {Object} channelExt - Optional external channel to send messages if interaction is not provided.
 */
export async function stopRecordingAndTranscribe(interaction, channelExt) {
  // Use the interaction's channel if available; otherwise, use the external channel provided
  const channel = interaction?.channel || channelExt;

  // Log an error and exit if no channel is found
  if (!channel) {
    logger(`Channel not found. Unable to proceed with transcription.`, 'error');
    return;
  }

  try {
    // Retrieve the active session name
    const sessionName = getSessionName();
    if (!sessionName) {
      // Notify the user if there's no active session
      if (interaction) {
        await interaction.reply('No active scrying session found. Please start a session first.');
      } else {
        await channel.send('No active scrying session found. Please start a session first.');
      }
      setScryingSessionActive(false); // Update session status
      return;
    }

    // Send a message indicating that the transcription process may take time
    if (interaction) {
      await interaction.reply({
        content: 'Stopping the scrying and processing the vision… This may take a while. Please remain patient and do not leave.',
        ephemeral: false
      });
    } else {
      await channel.send('Stopping the scrying and processing the vision… This may take a while. Please remain patient and do not leave.');
    }
    logger('Stopping recording and processing transcription...', 'info');

    // Stop all ongoing recordings
    await stopRecording();

    // Process transcription and retrieve the summary and file path
    const { summary, transcriptionFile } = await transcribeAndSaveSessionFolder(sessionName);

    // Notify the user with the transcription summary or an error message if the summary is unavailable
    if (summary) {
      if (interaction) {
        await interaction.editReply(`The orb dims, and the vision is now sealed in writing…\nSummary: ${summary}`);
      } else {
        await channel.send(`The orb dims, and the vision is now sealed in writing…\nSummary: ${summary}`);
      }
      logger(`Transcription saved to ${transcriptionFile}`, 'info');
    } else {
      if (interaction) {
        await interaction.editReply('Transcription or summary failed.');
      } else {
        await channel.send('Transcription or summary failed.');
      }
      logger('Transcription or summary failed.', 'error');
    }

    // Clear session state to prevent further recording attempts in this session
    setSessionName(null);
    setScryingSessionActive(false);

  } catch (error) {
    // Log the error and notify the user if an issue occurs during transcription
    logger(`Error during stop and transcribe process: ${error.message}`, 'error');
    if (interaction) {
      await interaction.editReply('An error occurred while processing the transcription and summary.');
    } else {
      await channel.send('An error occurred while processing the transcription and summary.');
    }
    setScryingSessionActive(false); // Update session status
  }
}