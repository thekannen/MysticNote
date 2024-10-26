import { joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { setConnection } from '../utils/recording.js';

export async function joinVoiceChannelHandler(interaction) {
  if (!interaction.guild || !interaction.member.voice?.channel) {
    await interaction.reply('Please join a voice channel in a server.');
    return;
  }

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

  await interaction.reply('The mystical orb swirls and reveals all voices within range…');
}
