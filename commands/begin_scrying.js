import { generateTimestamp } from '../utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startRecording, setSessionName, getActiveConnection, setScryingSessionActive } from '../utils/recording.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recordingsDir = path.join(__dirname, '../recordings');
const transcriptsDir = path.join(__dirname, '../transcripts');

// Begin scrying command handler
export async function transcribeAudioHandler(interaction) {
  try {
    // Get the session name provided by the user
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a session name to begin scrying.');
      return;
    }

    // Validate the session name
    if (sessionName.length > 50) {
      await interaction.reply('Session name must be no more than 50 characters.');
      return;
    }

    const sessionFolder = path.join(recordingsDir, sessionName);
    const transcriptFolder = path.join(transcriptsDir, sessionName);

    if (fs.existsSync(sessionFolder) || fs.existsSync(transcriptFolder)) {
      await interaction.reply('A session with this name already exists. Please choose a different name.');
      return;
    }

    // Create session directory if it does not exist
    fs.mkdirSync(sessionFolder, { recursive: true });
    fs.mkdirSync(transcriptFolder, { recursive: true });

    // Defer reply as joining voice channel and starting recording may take time
    await interaction.deferReply();

    // Get active connection for the guild
    const conn = getActiveConnection(interaction.guildId);
    if (!conn) {
      await interaction.editReply('The bot is not connected to a voice channel. Please use the `gaze` command first to connect.');
      return;
    }

    // Set the session name for the ongoing scrying session
    setSessionName(sessionName);

    // Start recording
    const userId = interaction.member.id;
    const username = interaction.member.user.username;
    const timestamp = generateTimestamp().replace(/[:.]/g, '-');
    const filePath = path.join(sessionFolder, `audio_${username}_${userId}_${timestamp}.wav`);

    await startRecording(conn, userId, username, filePath);

    // Reply to indicate recording has started
    await interaction.editReply(`Scrying session "${sessionName}" has begun. Recording is in progress.`);
    setScryingSessionActive(true); // Set session to active after beginning scrying

  } catch (error) {
    console.error('Error during begin_scrying command:', error);

    // If there was an error before a reply, ensure interaction is replied or edited
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply('An error occurred while attempting to begin the scrying session.');
    } else if (!interaction.replied) {
      await interaction.editReply('An error occurred while attempting to begin the scrying session.');
    }
  }
}
