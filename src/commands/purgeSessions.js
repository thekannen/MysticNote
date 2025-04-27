import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import config from '../config/config.js';

export const data = new SlashCommandBuilder()
  .setName('purge_sessions')
  .setDescription('🚨 Permanently delete ALL sessions.')
  .addStringOption(opt =>
    opt
      .setName('confirm')
      .setDescription('Type CONFIRM to proceed')
      .setRequired(true)
  );

export async function execute(interaction) {
  const c = interaction.options.getString('confirm');
  if (c !== 'CONFIRM') {
    await interaction.reply({ content: 'Purge cancelled.', ephemeral: true });
    return;
  }
  for (const dir of [config.recordingsDir, config.transcriptsDir]) {
    if (!fs.existsSync(dir)) continue;
    for (const sub of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, sub), { recursive: true, force: true });
    }
  }
  await interaction.reply({ content: '✅ All sessions purged.', ephemeral: true });
}