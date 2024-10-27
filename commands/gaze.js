import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { setConnection } from '../utils/recording.js';

export async function joinVoiceChannelHandler(interaction) {
  if (!interaction.guild || !interaction.member.voice?.channel) {
    await interaction.reply({
      content: 'Please join a voice channel in a server for the scrying to commence.',
      ephemeral: true,
    });
    return null; // Return null if there's no valid voice channel
  }

  try {
    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: interaction.member.voice.channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
      console.log('The bot has connected to the channel!');
      // Store the connection for use in recording.js
      setConnection(connection);
    });

    // Acknowledge interaction with a reply
    await interaction.reply({
      content: 'The mystical orb swirls and reveals all voices within range…',
      ephemeral: false,
    });

    return connection; // Return the connection object for other functions to use
  } catch (error) {
    console.error('Error joining voice channel:', error);

    // If there is an error, reply to the interaction
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred while attempting to join the voice channel.',
        ephemeral: true,
      });
    }
    return null;
  }
}
