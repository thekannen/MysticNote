import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} from '@discordjs/voice';
import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { setConnection } from '../services/recordingService.js';
import { logger, verboseLog } from '../utils/logger.js';

/**
 * Data for the 'gaze' command.
 */
export const data = new SlashCommandBuilder()
  .setName('gaze')
  .setDescription(
    'The bot enters the channel, peering into the voices of the unseen.'
  );

/**
 * Executes the 'gaze' command.
 * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
 * @returns {Promise<import('@discordjs/voice').VoiceConnection|null>} The voice connection if successful, otherwise null.
 */
export async function execute(interaction) {
  // Ensure the interaction is in a server and the user is in a voice channel
  if (!interaction.guild || !interaction.member.voice?.channel) {
    await interaction.reply({
      content:
        'Please join a voice channel in a server for the scrying to commence.',
      ephemeral: true,
    });
    verboseLog('User is not in a voice channel or guild.');
    return null;
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
    verboseLog('Bot lacks permissions to join or speak in the voice channel.');
    return null;
  }

  // Check if the bot is already connected to the voice channel
  const existingConnection = getVoiceConnection(interaction.guild.id);
  if (existingConnection) {
    if (
      existingConnection.joinConfig.channelId ===
      interaction.member.voice.channel.id
    ) {
      await interaction.reply({
        content: 'I am already connected to your voice channel!',
        ephemeral: true,
      });
      return existingConnection;
    } else {
      existingConnection.destroy();
    }
  }

  try {
    await interaction.deferReply();

    // Attempt to connect to the voice channel the user is in
    const connection = joinVoiceChannel({
      channelId: interaction.member.voice.channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    // Wait for the connection to be ready
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    logger('The bot has connected to the channel!', 'info');
    setConnection(connection); // Store the connection for future use

    // Handle disconnections
    connection.on(
      'stateChange',
      async (oldState, newState) => {
        if (
          oldState.status === VoiceConnectionStatus.Ready &&
          newState.status === VoiceConnectionStatus.Disconnected
        ) {
          try {
            // Attempt to reconnect
            await Promise.race([
              entersState(
                connection,
                VoiceConnectionStatus.Signalling,
                5_000
              ),
              entersState(
                connection,
                VoiceConnectionStatus.Connecting,
                5_000
              ),
            ]);
            // Reconnected successfully
            logger('Reconnected to the voice channel.', 'info');
          } catch (error) {
            // Unable to reconnect within 5 seconds
            logger('Disconnected from the voice channel.', 'warn');
            connection.destroy();
          }
        }
      }
    );

    // Notify the user that the bot has joined the voice channel
    await interaction.editReply({
      content:
        'The mystical orb swirls and reveals all voices within range…',
    });

    return connection; // Return the established connection
  } catch (error) {
    // Log the error and notify the user if joining fails
    logger(`Error joining voice channel: ${error.message}`, 'error');
    verboseLog(`Stack trace: ${error.stack}`);

    if (interaction.deferred) {
      await interaction.editReply({
        content:
          'An error occurred while attempting to join the voice channel.',
      });
    } else if (!interaction.replied) {
      await interaction.reply({
        content:
          'An error occurred while attempting to join the voice channel.',
        ephemeral: true,
      });
    }
    return null; // Return null if an error occurs
  }
}
