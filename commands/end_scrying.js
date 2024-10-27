import { transcribeAndSaveSessionFiles } from '../utils/whisper.js';
import { stopRecording } from '../utils/recording.js';
import { cleanFiles, generateTimestamp } from '../utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let sessionFiles = []; // Tracks audio files for the current session

export async function stopRecordingAndTranscribe(interaction) {
  try {
    await interaction.deferReply();
    console.log('Stopping recording and processing transcription...');

    const userId = interaction.member.id;
    const username = interaction.member.user.username;

    // Stop recording for the user and add their file to sessionFiles
    const recordingData = await stopRecording(userId);
    if (!recordingData) {
      await interaction.followUp(`No audio found for ${username}.`);
      return;
    }

    sessionFiles.push(recordingData.filePath); // Track the recorded file for the session

    await interaction.followUp(`Recording stopped for ${username}. Processing transcription...`);

    // Transcribe all session files after recording ends
    const { summary, transcriptionFile } = await transcribeAndSaveSessionFiles(sessionFiles);

    if (summary) {
      await interaction.followUp(`The orb dims, and the vision is now sealed in writing…`);
      await interaction.followUp(`Summary: ${summary}`);
      console.log(`Full transcription saved to ${transcriptionFile}`);
    } else {
      await interaction.followUp(`Transcription or summary failed.`);
    }

    // Clear session files after processing
    sessionFiles = [];
  } catch (error) {
    console.error('Error during stop and transcribe process:', error);
    await interaction.followUp('An error occurred while processing the transcription and summary.');
  }
}

// Merges and deletes individual transcription files if needed
function mergeSessionTranscriptions() {
  if (sessionFiles.length === 0) return; // No files to merge

  try {
    const mergedTranscription = sessionFiles
      .map(file => fs.readFileSync(file, 'utf-8'))
      .join('\n');

    const transcriptsDir = path.join(__dirname, '../transcripts');
    if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir);

    const timestamp = generateTimestamp().replace(/[:.]/g, '-');
    const finalFilePath = path.join(transcriptsDir, `full_conversation_log_${timestamp}.txt`);
    fs.writeFileSync(finalFilePath, mergedTranscription);

    console.log(`Full transcription saved as ${finalFilePath}`);

    cleanFiles('transcription_'); // Remove individual transcription files after merging
    sessionFiles = []; // Reset session tracking after merge
  } catch (error) {
    console.error('Error during session transcription merge:', error);
  }
}