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

  // Get user information
  const userId = interaction.member.user.id;
  const username = interaction.member.user.username;

  console.log(`User ID: ${userId}, Username: ${username}`);

  // Start recording for the user
  startRecording(connection, userId, username);

  await interaction.reply('Recording started for all users in the voice channel.');
}
