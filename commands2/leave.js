import { getVoiceConnection } from '@discordjs/voice';

export async function leaveVoiceChannelHandler(interaction) {
  const connection = getVoiceConnection(interaction.guild.id);
  if (connection) {
    connection.destroy();
    await interaction.reply('Left the voice channel.');
  } else {
    await interaction.reply("I'm not in a voice channel.");
  }
}
