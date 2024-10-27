import { getVoiceConnection } from '@discordjs/voice';
import { isScryingSessionOngoing, clearConnection } from '../utils/recording.js';
import { logger } from '../utils/logger.js';

export async function leaveVoiceChannelHandler(interaction) {
  try {
    if (isScryingSessionOngoing()) {
      await interaction.reply('You must end the scrying session before I can leave. Use the `end_scrying` command.');
      return;
    }

    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
      connection.destroy();
      clearConnection();
      await interaction.reply('The scrying fades, and the vision dims as I depart…');
    } else {
      await interaction.reply("I'm not in a voice channel.");
    }
  } catch (error) {
    logger('Error while attempting to leave voice channel:', 'error');
    await interaction.reply('An error occurred while attempting to leave the voice channel. Please try again.');
  }
}