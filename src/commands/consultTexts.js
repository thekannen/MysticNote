import fs from 'fs';
import path from 'path';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

// Define the path to the transcripts directory
const transcriptsDir = path.join(getDirName(), '../../bin/transcripts');

/**
 * Retrieves and lists all recorded scrying sessions (directories) within the transcripts folder.
 *
 * @param {Object} interaction - The Discord interaction for sending replies.
 */
export async function consultTheTextsHandler(interaction) {
  try {
    // Check if the transcripts directory exists; if not, notify user of empty texts
    if (!fs.existsSync(transcriptsDir)) {
      await interaction.reply('No scrying sessions found. The texts are empty.');
      return;
    }

    // Read all subdirectories in the transcripts directory
    const sessionFolders = fs.readdirSync(transcriptsDir).filter(folder => {
      const fullPath = path.join(transcriptsDir, folder);
      return fs.statSync(fullPath).isDirectory(); // Only include directories (sessions)
    });

    // If no session folders are found, notify the user
    if (sessionFolders.length === 0) {
      await interaction.reply('No scrying sessions found. The texts are empty.');
      return;
    }

    // Map each session folder to a string with its name and creation date
    const sessionList = sessionFolders
      .map((folder, index) => {
        const fullPath = path.join(transcriptsDir, folder);
        const createdDate = fs.statSync(fullPath).birthtime.toLocaleString(); // Format creation date
        return `**${index + 1}.** ${folder} (Created on: ${createdDate})`;
      })
      .join('\n');

    // Construct the final message to send to the user
    const responseMessage = `The following scrying sessions have been recorded in the archives:\n\n${sessionList}`;

    // Send the list of sessions to the user
    await interaction.reply(responseMessage);
  } catch (error) {
    // Log any errors and notify the user
    logger('Error retrieving session names:', 'error');
    await interaction.reply('An error occurred while consulting the texts.');
  }
}