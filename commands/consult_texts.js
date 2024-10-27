import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const transcriptsDir = path.join(__dirname, '../transcripts');

export async function consultTheTextsHandler(interaction) {
  try {
    if (!fs.existsSync(transcriptsDir)) {
      await interaction.reply('No scrying sessions found. The texts are empty.');
      return;
    }

    const sessionFolders = fs.readdirSync(transcriptsDir).filter(folder => {
      const fullPath = path.join(transcriptsDir, folder);
      return fs.statSync(fullPath).isDirectory();
    });

    if (sessionFolders.length === 0) {
      await interaction.reply('No scrying sessions found. The texts are empty.');
      return;
    }

    const sessionList = sessionFolders
      .map((folder, index) => {
        const fullPath = path.join(transcriptsDir, folder);
        const createdDate = fs.statSync(fullPath).birthtime.toLocaleString();
        return `**${index + 1}.** ${folder} (Created on: ${createdDate})`;
      })
      .join('\n');

    const responseMessage = `The following scrying sessions have been recorded in the archives:\n\n${sessionList}`;

    await interaction.reply(responseMessage);
  } catch (error) {
    logger('Error retrieving session names:', 'error');
    await interaction.reply('An error occurred while consulting the texts.');
  }
}