import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recordingsDir = path.join(__dirname, '../recordings');
const transcriptsDir = path.join(__dirname, '../transcripts');

// Delete session handler
export async function deleteSessionHandler(interaction) {
  try {
    const sessionName = interaction.options.getString('session');
    if (!sessionName) {
      await interaction.reply('Please provide a valid session name to delete.');
      return;
    }

    const sessionRecordingDir = path.join(recordingsDir, sessionName);
    const sessionTranscriptDir = path.join(transcriptsDir, sessionName);

    // Check if session directories exist
    if (!fs.existsSync(sessionRecordingDir) && !fs.existsSync(sessionTranscriptDir)) {
      await interaction.reply(`No session named "${sessionName}" found.`);
      return;
    }

    // Delete session folders
    if (fs.existsSync(sessionRecordingDir)) {
      fs.rmSync(sessionRecordingDir, { recursive: true, force: true });
    }
    if (fs.existsSync(sessionTranscriptDir)) {
      fs.rmSync(sessionTranscriptDir, { recursive: true, force: true });
    }

    await interaction.reply(`The session "${sessionName}" has been deleted successfully.`);
  } catch (error) {
    console.error('Error deleting session:', error);
    await interaction.reply('An error occurred while attempting to delete the session.');
  }
}

// Purge Handler: Deletes all sessions
export async function purgeHandler(interaction) {
    try {
      const confirmation = interaction.options.getString('confirmation');
      if (!confirmation) {
        await interaction.reply('Confirmation is required to proceed with purging all sessions.');
        return;
      }
  
      if (confirmation.toLowerCase() !== 'y') {
        await interaction.reply('Purge canceled. No sessions were deleted.');
        return;
      }
  
      // Delete all session folders in transcripts and recordings
      [transcriptsDir, recordingsDir].forEach((dir) => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach((folder) => {
            const fullPath = path.join(dir, folder);
            fs.rmSync(fullPath, { recursive: true, force: true });
          });
        }
      });
  
      await interaction.reply('All sessions have been purged successfully.');
    } catch (error) {
      console.error('Error purging sessions:', error);
      await interaction.reply('An error occurred while purging all sessions.');
    }
  }