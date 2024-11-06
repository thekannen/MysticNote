import fs from 'fs';
import path from 'path';
import { PermissionsBitField } from 'discord.js';
import config from '../config/config.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import {
  startRecording,
  setSessionName,
  getActiveConnection,
  setScryingSessionActive,
} from '../services/recordingService.js';
import { logger } from '../utils/logger.js';

/**
 * Data for the 'begin_scrying' command.
 */
export const data = {
  name: 'begin_scrying',
  description:
    'Start recording the words spoken, capturing them as if seen through a crystal ball.',
  options: [
    {
      type: 3, // STRING type
      name: 'session',
      description: `The name of the session (up to ${config.sessionNameMaxLength} characters, must be unique)`,
      required: true,
    },
  ],
};

/**
 * Executes the 'begin_scrying' command.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 */
export async function execute(interaction) {
  try {
    // Retrieve the session name provided by the user via the interaction command
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply({
        content: 'Please provide a session name to begin scrying.',
        ephemeral: true,
      });
      logger('No session name provided.', 'verbose');
      return;
    }

    // Check if the session name exceeds the configured length
    if (sessionName.length > config.sessionNameMaxLength) {
      await interaction.reply({
        content: `Session name must be no more than ${config.sessionNameMaxLength} characters.`,
        ephemeral: true,
      });
      logger(
        `Session name exceeds maximum length of ${config.sessionNameMaxLength} characters.`, 'verbose'
      );
      return;
    }

    // Ensure the interaction is in a server and the user is in a voice channel
    if (!interaction.guild || !interaction.member.voice?.channel) {
      await interaction.reply({
        content:
          'Please join a voice channel in a server for the scrying to commence.',
        ephemeral: true,
      });
      return;
    }

    // Check if the bot has the necessary permissions
    const permissions = interaction.member.voice.channel.permissionsFor(
      interaction.client.user
    );
    if (
      !permissions.has(PermissionsBitField.Flags.Connect) ||
      !permissions.has(PermissionsBitField.Flags.Speak)
    ) {
      await interaction.reply({
        content: 'I need permission to join and speak in your voice channel!',
        ephemeral: true,
      });
      return;
    }

    // Define paths for session recordings and transcripts
    const recordingsDir = path.join(getDirName(), '../../bin/recordings');
    const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');
    const sessionFolder = path.join(recordingsDir, sessionName);
    const transcriptFolder = path.join(transcriptsDir, sessionName);

    // Check for session folder existence to avoid name duplication
    if (fs.existsSync(sessionFolder) || fs.existsSync(transcriptFolder)) {
      await interaction.reply({
        content:
          'A session with this name already exists. Please choose a different name.',
        ephemeral: true,
      });
      logger('A session with this name already exists.', 'verbose');
      return;
    }

    // Defer reply as the bot's setup for recording might take time
    await interaction.deferReply();

    // Retrieve the active voice connection
    const conn = getActiveConnection(interaction.guildId);
    if (!conn) {
      await interaction.editReply({
        content:
          'The bot is not connected to a voice channel. Please use the `/gaze` command first to connect.',
      });
      logger('Bot is not connected to a voice channel.', 'verbose');
      return;
    }

    // Set the session name to track the current scrying session
    setSessionName(sessionName);

    // Retrieve members in the voice channel for recording setup
    const members = interaction.member.voice.channel.members;
    const timestamp = generateTimestamp();

    // Create directories for the session's recordings and transcripts
    fs.mkdirSync(sessionFolder, { recursive: true });
    fs.mkdirSync(transcriptFolder, { recursive: true });
    logger(`Created directories for session: ${sessionName}`, 'info');

    // Loop through each member in the voice channel to initiate recording
    for (const [memberId, member] of members) {
      if (member.user.bot) continue; // Skip bot users

      const username = member.user.username;
      const filePath = path.join(
        sessionFolder,
        `audio_${username}_${memberId}_${timestamp}.wav`
      );

      // Start recording for each user in the channel
      await startRecording(conn, memberId, username, filePath);
    }

    // Notify the user that the recording has started
    await interaction.editReply({
      content: `Scrying session "${sessionName}" has begun. Recording is in progress for all users in the channel.`,
    });

    // Set the session to active, storing the channel ID for notifications
    setScryingSessionActive(true, interaction.channel.id);
    logger(`Scrying session "${sessionName}" is now active.`, 'info');
  } catch (error) {
    // Log the error and notify the user
    logger(`Error during begin_scrying command: ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');

    // Ensure the interaction is responded to in case of an error
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          'An error occurred while attempting to begin the scrying session.',
        ephemeral: true,
      });
    } else if (!interaction.replied) {
      await interaction.editReply({
        content:
          'An error occurred while attempting to begin the scrying session.',
      });
    }
  }
}
