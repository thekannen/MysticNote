import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import config from '../config/config.js';

export const data = new SlashCommandBuilder()
  .setName('list_sessions')
  .setDescription('List all recorded sessions.');

export async function execute(interaction) {
  const dir = config.recordingsDir;
  if (!fs.existsSync(dir)) {
    await interaction.reply({ content: 'No sessions found yet.', ephemeral: true });
    return;
  }
  const sessions = fs.readdirSync(dir).filter(d =>
    fs.statSync(path.join(dir, d)).isDirectory()
  );
  if (!sessions.length) {
    await interaction.reply({ content: 'No sessions found yet.', ephemeral: true });
    return;
  }
  const list = sessions.map((s, i) => `**${i + 1}.** ${s}`).join('\n');
  await interaction.reply({ content: `📚 Sessions:\n${list}`, ephemeral: true });
}