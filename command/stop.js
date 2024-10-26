import { transcribeAndSave } from '../utils/whisper.js';
import { stopRecording } from '../utils/recording.js';
import { cleanFiles, generateTimestamp } from '../utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let sessionFiles = []; // Track transcription files generated during the session

export async function stopRecordingAndTranscribe(interaction) {
  try {
    await interaction.deferReply();
    console.log('Stopping recording and processing transcription...');

    const userId = interaction.member.id;
    const username = interaction.member.user.username;

    const recordingData = await stopRecording(userId);
    if (!recordingData) {
      await interaction.followUp(`No audio found for ${username}.`);
      return;
    }

    const { summary, transcriptionFile } = await transcribeAndSave(recordingData.filePath, username);
    sessionFiles.push(transcriptionFile); // Track transcription files for merging

    if (summary) {
      await interaction.followUp(`The orb dims, and the vision is now sealed in writing…`);
      await interaction.followUp(`Summary: ${summary}`);
      interaction.channel.send(`The scrying was successful, ${interaction.user.username}. You may consult the orb for the full vision.`);
      console.log(`Transcription saved to ${transcriptionFile}`);
    } else {
      await interaction.followUp(`Transcription or summary failed for ${username}.`);
    }

    mergeSessionTranscriptions();
  } catch (error) {
    console.error('Error during stop and transcribe process:', error);
    await interaction.followUp('An error occurred while processing the transcription and summary.');
  }
}

// Merging transcriptions created during the session into a full conversation log
function mergeSessionTranscriptions() {
  try {
    const mergedTranscription = sessionFiles
      .map(file => fs.readFileSync(file, 'utf-8')) // Read transcription text files only
      .join('\n'); // Concatenate transcription content

    const transcriptsDir = path.join(__dirname, '../transcripts');
    if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir);

    const timestamp = generateTimestamp().replace(/[:.]/g, '-');
    const finalFilePath = path.join(transcriptsDir, `full_conversation_log_${timestamp}.txt`);
    fs.writeFileSync(finalFilePath, mergedTranscription);

    console.log(`Full transcription saved as ${finalFilePath}`);

    cleanFiles('transcription_'); // Clean up individual transcription files after merge
    sessionFiles = []; // Reset session tracking
  } catch (error) {
    console.error('Error during session transcription merge:', error);
  }
}
