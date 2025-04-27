import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import config from '../config/config.js';
import { sanitizeName } from '../utils/common.js';

export const data = new SlashCommandBuilder()
  .setName('delete_session')
  .setDescription('Delete all data for a session.')
  .addStringOption(opt =>
    opt.setName('name').setDescription('Session name').setRequired(true)
  );

export async function execute(interaction) {
  const raw = interaction.options.getString('name');
  const name = sanitizeName(raw);
  const recDir = path.join(config.recordingsDir, name);
  const txtDir = path.join(config.transcriptsDir, name);
  if (!fs.existsSync(recDir) && !fs.existsSync(txtDir)) {
    await interaction.reply({ content: `No session "${raw}".`, ephemeral: true });
    return;
  }
  // prevent deleting active
  // (you can import isSessionActive and getSessionName if desired)
  fs.rmSync(recDir, { recursive: true, force: true });
  fs.rmSync(txtDir, { recursive: true, force: true });
  await interaction.reply({ content: `✅ Deleted session "${raw}".`, ephemeral: true });
}