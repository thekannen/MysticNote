import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { joinChannel } from '../services/recordingService.js';

export const data = new SlashCommandBuilder()
  .setName('gaze')
  .setDescription('Have the bot join your voice channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Connect);

export async function execute(interaction) {
  const vc = interaction.member.voice.channel;
  if (!vc) {
    await interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
    return;
  }
  try {
    await joinChannel(vc, interaction.channel);
    await interaction.reply('👁️ I have joined your channel.');
  } catch (err) {
    await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
  }
}