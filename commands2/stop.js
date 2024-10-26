import { transcribeWithWhisper } from '../utils/whisper.js';
import { stopRecording } from '../utils/recording.js';

export async function stopRecordingAndTranscribe(interaction) {
  try {
    console.log('Stopping recording...');
    
    // Stop recording and check if it was successful
    const recordingSuccess = await stopRecording();
    if (!recordingSuccess) {
      await interaction.followUp('Recording failed or no audio was saved.');
      return;
    }

    // Notify user that transcription is in progress
    await interaction.followUp('Recording stopped. Processing transcription...');

    // Process transcription asynchronously
    const transcription = await transcribeWithWhisper();
    if (transcription) {
      await interaction.followUp(`Transcription complete: ${transcription}`);
    } else {
      await interaction.followUp('Transcription failed.');
    }
  } catch (error) {
    console.error('Error during stop and transcribe process:', error);
    await interaction.followUp('An error occurred while processing the transcription.');
  }
}
