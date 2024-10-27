import { getVoiceConnection } from '@discordjs/voice';
import { isScryingSessionOngoing, clearConnection } from '../utils/recording.js';

export async function leaveVoiceChannelHandler(interaction) {
  try {
    // Check if a scrying session is ongoing
    if (isScryingSessionOngoing()) {
      await interaction.reply('You must end the scrying session before I can leave. Use the `end_scrying` command.');
      return;
    }

    // Get the current voice connection for the guild
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
      // Destroy the connection and clear stored references
      connection.destroy();
      clearConnection(); // Make sure to reset the connection in memory
      await interaction.reply('The scrying fades, and the vision dims as I depart…');
    } else {
      await interaction.reply("I'm not in a voice channel.");
    }
  } catch (error) {
    console.error('Error while attempting to leave voice channel:', error);
    await interaction.reply('An error occurred while attempting to leave the voice channel. Please try again.');
  }
}
