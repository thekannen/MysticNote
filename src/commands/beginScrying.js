import fs from 'fs';
import path from 'path';
import config from '../config/config.js';
import { getDirName } from '../utils/common.js';
import { generateTimestamp } from '../utils/common.js';
import { startRecording, setSessionName, getActiveConnection, setScryingSessionActive } from '../services/recordingService.js';
import { logger } from '../utils/logger.js';

// Directories for storing recordings and transcripts
const recordingsDir = path.join(getDirName(), '../../bin/recordings');
const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

/**
 * Handles the command to begin a scrying session, capturing and recording audio from users in a voice channel.
 *
 * @param {Object} interaction - The Discord interaction object.
 */
export async function transcribeAudioHandler(interaction) {
  try {
    // Retrieve the session name provided by the user via the interaction command
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a session name to begin scrying.');
      return;
    }

    // Check if the session name exceeds the configured length
    if (sessionName.length > config.sessionNameMaxLength) {
      await interaction.reply(`Session name must be no more than ${config.sessionNameMaxLength} characters.`);
      return;
    }

    // Define paths for session recordings and transcripts
    const sessionFolder = path.join(recordingsDir, sessionName);
    const transcriptFolder = path.join(transcriptsDir, sessionName);

    // Check for session folder existence to avoid name duplication
    if (fs.existsSync(sessionFolder) || fs.existsSync(transcriptFolder)) {
      await interaction.reply('A session with this name already exists. Please choose a different name.');
      return;
    }

    // Create directories for the session's recordings and transcripts
    fs.mkdirSync(sessionFolder, { recursive: true });
    fs.mkdirSync(transcriptFolder, { recursive: true });

    // Defer reply as the bot's setup for recording might take time
    await interaction.deferReply();

    // Retrieve the active voice connection
    const conn = getActiveConnection(interaction.guildId);
    if (!conn) {
      await interaction.editReply('The bot is not connected to a voice channel. Please use the `gaze` command first to connect.');
      return;
    }

    // Set the session name to track the current scrying session
    setSessionName(sessionName);

    // Retrieve members in the voice channel for recording setup
    const members = interaction.member.voice.channel.members;
    const timestamp = generateTimestamp().replace(/[:.]/g, '-');

    // Loop through each member in the voice channel to initiate recording
    for (const [memberId, member] of members) {
      if (member.user.bot) continue; // Skip bot users

      const username = member.user.username;
      const filePath = path.join(sessionFolder, `audio_${username}_${memberId}_${timestamp}.wav`);

      // Start recording for each user in the channel
      await startRecording(conn, memberId, username, filePath);
      logger(`Started recording for user ${username} (ID: ${memberId})`, 'info');
    }

    // Notify the user that the recording has started
    await interaction.editReply(`Scrying session "${sessionName}" has begun. Recording is in progress for all users in the channel.`);
  
    // Set the session to active, storing the channel ID for notifications
    setScryingSessionActive(true, interaction.channel.id);

  } catch (error) {
    // Log the error and notify the user
    logger(`Error during begin_scrying command: ${error.message}`, 'error');

    // Ensure the interaction is responded to in case of an error
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply('An error occurred while attempting to begin the scrying session.');
    } else if (!interaction.replied) {
      await interaction.editReply('An error occurred while attempting to begin the scrying session.');
    }
  }
}