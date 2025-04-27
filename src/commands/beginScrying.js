import { SlashCommandBuilder } from 'discord.js';
import { beginSession } from '../services/recordingService.js';

export const data = new SlashCommandBuilder()
  .setName('begin_scrying')
  .setDescription('Start a new recording session.')
  .addStringOption(opt =>
    opt.setName('name').setDescription('Session name').setRequired(true)
  );

export async function execute(interaction) {
  const name = interaction.options.getString('name');
  try {
    await beginSession(name, interaction.member.voice.channel, interaction.channel);
    await interaction.reply(`✅ Recording started for session **${name}**.`);
  } catch (err) {
    await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
  }
}