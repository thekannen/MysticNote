import { getVoiceConnection } from '@discordjs/voice';
import { isScryingSessionOngoing, clearConnection } from '../services/recordingService.js';
import { logger, verboseLog } from '../utils/logger.js';

/**
 * Handles the command to make the bot leave the current voice channel.
 * Checks if a scrying session is ongoing before allowing the bot to disconnect.
 *
 * @param {Object} interaction - The Discord interaction containing the command details.
 */
export async function leaveVoiceChannelHandler(interaction) {
  try {
    // Check if a scrying session is still active; if so, prevent leaving
    if (isScryingSessionOngoing()) {
      await interaction.reply('You must end the scrying session before I can leave. Use the `end_scrying` command.');
      verboseLog('You must end the scrying session before I can leave. Use the `end_scrying` command.');
      return;
    }

    // Retrieve the current voice connection for the guild
    const connection = getVoiceConnection(interaction.guild.id);

    // If the bot is connected to a voice channel, disconnect and clear the connection
    if (connection) {
      connection.destroy(); // Disconnect the bot from the voice channel
      clearConnection(); // Clear the connection state in the application
      await interaction.reply('The scrying fades, and the vision dims as I depart…');
      verboseLog('The scrying fades, and the vision dims as I depart…');
    } else {
      // Inform the user if the bot is not in a voice channel
      await interaction.reply("I'm not in a voice channel.");
      verboseLog("I'm not in a voice channel.");
    }
  } catch (error) {
    // Log the error and inform the user if something goes wrong during the disconnection process
    logger('Error while attempting to leave voice channel:', 'error');
    await interaction.reply('An error occurred while attempting to leave the voice channel. Please try again.');
  }
}