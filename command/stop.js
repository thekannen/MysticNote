import { transcribeAndSummarize } from '../utils/whisper.js';
import { stopRecording } from '../utils/recording.js';
import { cleanFiles, generateTimestamp } from '../utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    const { summary, transcriptionFile } = await transcribeAndSummarize(recordingData.filePath, username);

    if (summary) {
      // Follow up on the interaction response with the summary
      await interaction.followUp(`The orb dims, and the vision is now sealed in writing…`);
      await interaction.followUp(`Summary: ${summary}`);

      // Send a basic comment in the chat
      interaction.channel.send(`The scrying was successful, ${interaction.user.username}. You may consult the orb for the full vision.`);
      console.log(`Full transcription saved to ${transcriptionFile}`);
    } else {
      await interaction.followUp(`Transcription or summary failed for ${username}.`);
    }

    mergeTranscriptions();
  } catch (error) {
    console.error('Error during stop and transcribe process:', error);
    await interaction.followUp('An error occurred while processing the transcription and summary.');
  }
}

// Merge individual transcriptions with timestamps into a single conversation log
function mergeTranscriptions() {
  const transcriptionFiles = fs.readdirSync('./')
    .filter(file => file.startsWith('transcription_') && file.endsWith('.txt'));

  const mergedTranscription = transcriptionFiles
    .map(file => fs.readFileSync(file, 'utf-8'))
    .sort((a, b) => new Date(a.split(' - ')[0]) - new Date(b.split(' - ')[0]))
    .join('\n');

  const transcriptsDir = path.join(__dirname, '../transcripts');
  if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir);

  const timestamp = generateTimestamp().replace(/[:.]/g, '-');
  const finalFilePath = path.join(transcriptsDir, `full_conversation_log_${timestamp}.txt`);
  fs.writeFileSync(finalFilePath, mergedTranscription);

  console.log(`Full transcription saved as ${finalFilePath}`);
  cleanFiles('transcription_'); // Cleanup individual transcription files after merging
}
