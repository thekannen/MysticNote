import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import config from '../config/config.js';
import { sanitizeName } from '../utils/common.js';

export const data = new SlashCommandBuilder()
  .setName('reveal_summary')
  .setDescription('Show the summary of a session.')
  .addStringOption(opt =>
    opt.setName('name').setDescription('Session name').setRequired(true)
  );

export async function execute(interaction) {
  const raw = interaction.options.getString('name');
  const name = sanitizeName(raw);
  const file = path.join(config.transcriptsDir, name, 'summary.txt');
  if (!fs.existsSync(file)) {
    await interaction.reply({ content: `No summary for "${raw}".`, ephemeral: true });
    return;
  }
  const txt = fs.readFileSync(file, 'utf-8');
  if (txt.length > 1900) {
    await interaction.reply({
      files: [{ attachment: Buffer.from(txt), name: 'summary.txt' }],
      ephemeral: false,
    });
  } else {
    await interaction.reply(`📝 Summary:\n${txt}`);
  }
}