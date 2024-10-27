import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { setConnection } from '../utils/recording.js';
import { logger } from '../utils/logger.js';

export async function joinVoiceChannelHandler(interaction) {
  if (!interaction.guild || !interaction.member.voice?.channel) {
    await interaction.reply({
      content: 'Please join a voice channel in a server for the scrying to commence.',
      ephemeral: true,
    });
    return null;
  }

  try {
    const connection = joinVoiceChannel({
      channelId: interaction.member.voice.channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
      logger('The bot has connected to the channel!', 'info');
      setConnection(connection);
    });

    await interaction.reply({
      content: 'The mystical orb swirls and reveals all voices within range…',
      ephemeral: false,
    });

    return connection;
  } catch (error) {
    logger('Error joining voice channel:', 'error');
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while attempting to join the voice channel.',
        ephemeral: true,
      });
    }
    return null;
  }
}