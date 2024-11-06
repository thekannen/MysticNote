import fs from 'fs/promises';
import path from 'path';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

export const data = {
  name: 'consult_the_texts',
  description: "Lists all the scrying sessions saved to the wizard's tome.",
};

export async function execute(interaction) {
  try {
    const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

    // Check if the transcripts directory exists; if not, notify user of empty texts
    try {
      await fs.access(transcriptsDir);
    } catch {
      await interaction.reply('No scrying sessions found. The texts are empty.');
      logger('No scrying sessions found. The texts are empty.', 'verbose');
      return;
    }

    // Read all subdirectories in the transcripts directory
    const entries = await fs.readdir(transcriptsDir, { withFileTypes: true });
    const sessionFolders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // If no session folders are found, notify the user
    if (sessionFolders.length === 0) {
      await interaction.reply('No scrying sessions found. The texts are empty.');
      logger('No scrying sessions found. The texts are empty.', 'verbose');
      return;
    }

    // Map each session folder to a string with its name and creation date
    const sessionListPromises = sessionFolders.map(async (folder, index) => {
      const fullPath = path.join(transcriptsDir, folder);
      const stats = await fs.stat(fullPath);
      const createdDate = stats.birthtime.toLocaleString();
      return `**${index + 1}.** ${folder} (Created on: ${createdDate})`;
    });

    const sessionList = (await Promise.all(sessionListPromises)).join('\n');

    // Construct the final message to send to the user
    const responseMessage = `The following scrying sessions have been recorded in the archives:\n\n${sessionList}`;

    // Send the list of sessions to the user
    await interaction.reply(responseMessage);
  } catch (error) {
    // Log any errors and notify the user
    logger(`Error retrieving session names: ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');
    await interaction.reply('An error occurred while consulting the texts.');
  }
}
