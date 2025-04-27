import { SlashCommandBuilder } from 'discord.js';
import { beginSession } from '../services/recordingService.js';

export const data = new SlashCommandBuilder()
  .setName('begin_scrying')
  .setDescription('Start a new recording session.')
  .addStringOption(opt =>
    opt.setName('name').setDescription('Session name').setRequired(true)
  );

export async function execute(interaction) {
  const rawName = interaction.options.getString('name');
  const name = rawName?.trim();
  if (!name) {
    await interaction.reply({ content: `**${name}** is not a valid session name!`, ephemeral: true });
    return;
  }
  try {
    await beginSession(name, interaction.member.voice.channel, interaction.channel);
    await interaction.reply(`✅ Recording started for session **${name}**.`);
  } catch (err) {
    await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
  }
}