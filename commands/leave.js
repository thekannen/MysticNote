import { getVoiceConnection } from '@discordjs/voice';

export async function leaveVoiceChannelHandler(interaction) {
  const connection = getVoiceConnection(interaction.guild.id);
  if (connection) {
    connection.destroy();
    await interaction.reply('The scrying fades, and the vision dims as I depart…');
  } else {
    await interaction.reply("I'm not in a voice channel.");
  }
}