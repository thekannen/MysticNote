import { getVoiceConnection } from '@discordjs/voice';
import { isScryingSessionOngoing, clearConnection } from '../services/recordingService.js';
import { logger, verboseLog } from '../utils/logger.js';

/**
 * Handles the command to make the bot leave the current voice channel.
 * Checks if a scrying session is ongoing before allowing the bot to disconnect.
 *
 * @param {import('discord.js').CommandInteraction} interaction - The Discord interaction containing the command details.
 */
export async function leaveVoiceChannelHandler(interaction) {
  try {
    // Ensure the interaction is in a guild
    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used within a server.',
        ephemeral: true,
      });
      return;
    }

    // Check if a scrying session is still active; if so, prevent leaving
    if (isScryingSessionOngoing()) {
      await interaction.reply('You must end the scrying session before I can leave. Use the `end_scrying` command.');
      logger('User attempted to leave while a scrying session is ongoing.', 'info');
      return;
    }

    // Retrieve the current voice connection for the guild
    const connection = getVoiceConnection(interaction.guild.id);

    // If the bot is connected to a voice channel, disconnect and clear the connection
    if (connection) {
      connection.destroy(); // Disconnect the bot from the voice channel
      clearConnection(); // Clear the connection state in the application
      await interaction.reply('The scrying fades, and the vision dims as I depart…');
      logger('Bot has left the voice channel and cleared the connection.', 'info');
    } else {
      // Inform the user if the bot is not in a voice channel
      await interaction.reply("I'm not in a voice channel.");
      logger('User requested to leave, but bot was not in a voice channel.', 'info');
    }
  } catch (error) {
    // Log the error with details
    logger(`Error while attempting to leave voice channel: ${error.message}`, 'error');
    verboseLog(`Stack trace: ${error.stack}`);

    // Attempt to reply to the interaction if possible
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp('An error occurred while attempting to leave the voice channel. Please try again.');
      } else {
        await interaction.reply('An error occurred while attempting to leave the voice channel. Please try again.');
      }
    } catch (replyError) {
      // Log if unable to send error message to user
      logger(`Failed to send error message to user: ${replyError.message}`, 'error');
    }
  }
}