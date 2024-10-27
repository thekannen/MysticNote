import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const transcriptsDir = path.join(__dirname, '../transcripts');

// Command to consult the texts and list all session names with created dates
export async function consultTheTextsHandler(interaction) {
  try {
    // Check if transcripts directory exists
    if (!fs.existsSync(transcriptsDir)) {
      await interaction.reply('No scrying sessions found. The texts are empty.');
      return;
    }

    // Retrieve all session folders
    const sessionFolders = fs.readdirSync(transcriptsDir).filter(folder => {
      const fullPath = path.join(transcriptsDir, folder);
      return fs.statSync(fullPath).isDirectory();
    });

    // If there are no sessions, reply accordingly
    if (sessionFolders.length === 0) {
      await interaction.reply('No scrying sessions found. The texts are empty.');
      return;
    }

    // Format the response with session names and creation dates
    const sessionList = sessionFolders
      .map((folder, index) => {
        const fullPath = path.join(transcriptsDir, folder);
        const createdDate = fs.statSync(fullPath).birthtime.toLocaleString(); // Get folder creation date
        return `**${index + 1}.** ${folder} (Created on: ${createdDate})`;
      })
      .join('\n');

    const responseMessage = `The following scrying sessions have been recorded in the archives:\n\n${sessionList}`;

    await interaction.reply(responseMessage);
  } catch (error) {
    console.error('Error retrieving session names:', error);
    await interaction.reply('An error occurred while consulting the texts.');
  }
}