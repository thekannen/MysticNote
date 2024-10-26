import { getVoiceConnection } from '@discordjs/voice';
import { startRecording } from '../utils/recording.js';

export async function transcribeAudioHandler(interaction) {
  const connection = getVoiceConnection(interaction.guild.id);
  if (!connection) {
    await interaction.reply("I'm not in a voice channel.");
    return;
  }

  await interaction.reply('Starting to record audio for transcription...');
  startRecording(connection, interaction.member.id);
}
