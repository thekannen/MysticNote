import { transcribeAndSaveSessionFolder } from '../utils/whisper.js';
import { stopRecording, getSessionName, setSessionName, setScryingSessionActive } from '../utils/recording.js';
import { logger } from '../utils/logger.js';

export async function stopRecordingAndTranscribe(interaction) {
  try {
    const sessionName = getSessionName();
    if (!sessionName) {
      await interaction.reply('No active scrying session found. Please start a session first.');
      setScryingSessionActive(false);
      return;
    }

    // Initial reply asking for patience
    await interaction.reply({
      content: 'Stopping the scrying and processing the vision… This may take a while. Please remain patient and do not leave.',
      ephemeral: true
    });
    logger('Stopping recording and processing transcription...', 'info');

    // Stop all active recordings
    await stopRecording();

    const { summary, transcriptionFile } = await transcribeAndSaveSessionFolder(sessionName);
    if (summary) {
      await interaction.editReply(`The orb dims, and the vision is now sealed in writing…\nSummary: ${summary}`);
      logger(`Transcription saved to ${transcriptionFile}`, 'info');
    } else {
      await interaction.editReply('Transcription or summary failed.');
      setScryingSessionActive(false);
    }

    // Clear the session name to prevent further recording
    setSessionName(null);
    setScryingSessionActive(false);

  } catch (error) {
    logger('Error during stop and transcribe process:', 'error');
    await interaction.editReply('An error occurred while processing the transcription and summary.');
    setScryingSessionActive(false);
  }
}
