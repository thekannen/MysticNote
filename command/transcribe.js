import { joinVoiceChannel } from '@discordjs/voice';
import { startRecording } from '../utils/recording.js';

export async function transcribeAudioHandler(interaction) {
  if (!interaction.member.voice.channel) {
    await interaction.reply('Please join a voice channel first.');
    return;
  }

  // Join the voice channel
  const connection = joinVoiceChannel({
    channelId: interaction.member.voice.channel.id,
    guildId: interaction.guild.id,
    adapterCreator: interaction.guild.voiceAdapterCreator,
  });

  // Iterate over each member in the voice channel and start recording
  interaction.member.voice.channel.members.forEach((member) => {
    const userId = member.user.id;
    const username = member.user.username;

    console.log(`Starting recording for User ID: ${userId}, Username: ${username}`);
    
    // Start recording for each user
    startRecording(connection, userId, username);
  });
  await interaction.reply('The orb glows brighter, capturing every word within this mystical session…');
  await interaction.channel.send('Recording started for all users in the voice channel.');
}
