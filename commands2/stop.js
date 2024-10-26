import { transcribeAndSummarize } from '../utils/whisper.js';
import { stopRecording } from '../utils/recording.js';

export async function stopRecordingAndTranscribe(interaction) {
  try {
    // Defer reply to let Discord know we're processing
    await interaction.deferReply();
    
    console.log('Stopping recording and processing transcription...');
    const userId = interaction.member.id;
    const username = interaction.member.user.username;
    const recordingData = await stopRecording(userId);

    if (!recordingData) {
      await interaction.followUp(`No audio found for ${username}.`);
      return;
    }

    // Process transcription and summarization
    const { summary, transcriptionFile } = await transcribeAndSummarize(recordingData.filePath, username);

    if (summary) {
      await interaction.followUp(`Summary for ${username}: ${summary}`);
      console.log(`Full transcription saved to ${transcriptionFile}`);
    } else {
      await interaction.followUp(`Transcription or summary failed for ${username}.`);
    }
  } catch (error) {
    console.error('Error during stop and transcribe process:', error);
    await interaction.followUp('An error occurred while processing the transcription and summary.');
  }
}
