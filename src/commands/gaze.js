import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { setConnection } from '../services/recordingService.js';
import { logger, verboseLog } from '../utils/logger.js';

/**
 * Handles the command to make the bot join the user's voice channel.
 * If the user is not in a voice channel or not in a server, it replies with an error message.
 *
 * @param {Object} interaction - The Discord interaction containing the command details.
 * @returns {Object|null} The voice connection object if successful, otherwise null.
 */
export async function joinVoiceChannelHandler(interaction) {
  // Ensure the interaction is in a server and the user is in a voice channel
  if (!interaction.guild || !interaction.member.voice?.channel) {
    await interaction.reply({
      content: 'Please join a voice channel in a server for the scrying to commence.',
      ephemeral: true, // Only the user issuing the command will see this message
    });
    verboseLog('Please join a voice channel in a server for the scrying to commence.');
    return null;
  }

  try {
    // Attempt to connect to the voice channel the user is in
    const connection = joinVoiceChannel({
      channelId: interaction.member.voice.channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator, // Required to establish the connection
    });

    // Log and set the connection when the bot is ready
    connection.on(VoiceConnectionStatus.Ready, () => {
      logger('The bot has connected to the channel!', 'info');      
      setConnection(connection); // Store the connection for future use
    });

    // Notify the user that the bot has joined the voice channel
    await interaction.reply({
      content: 'The mystical orb swirls and reveals all voices within range…',
      ephemeral: false, // Visible to all in the server
    });

    return connection; // Return the established connection
  } catch (error) {
    // Log the error and notify the user if joining fails
    logger('Error joining voice channel:', 'error');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while attempting to join the voice channel.',
        ephemeral: true,
      });
    }
    return null; // Return null if an error occurs
  }
}