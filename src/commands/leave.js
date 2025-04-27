import { SlashCommandBuilder } from 'discord.js';
import { leaveChannel, isSessionActive } from '../services/recordingService.js';

export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Have the bot leave the voice channel.');

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  if (isSessionActive(guildId)) {
    await interaction.reply({ content: 'End the session before I can leave.', ephemeral: true });
    return;
  }
  leaveChannel(guildId);
  await interaction.reply('👋 I have left the channel.');
}