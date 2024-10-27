import 'dotenv/config';
import fs from 'fs';
import path from 'path'; // Add missing import for path
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recordingsDir = path.join(__dirname, '../recordings'); // Assuming __dirname is defined elsewhere or replace with correct path

export async function DiscordRequest(endpoint, options) {
  const url = 'https://discord.com/api/v10/' + endpoint;

  if (options.body) options.body = JSON.stringify(options.body);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'DND Scrying NoteTaker (https://github.com/thekannen/dnd-scrying-notetaker.git, 1.0.0)',
      },
      ...options,
    });

    if (!res.ok) {
      const data = await res.json();
      logger(`API request failed with status ${res.status}: ${JSON.stringify(data)}`, 'error');
      throw new Error(JSON.stringify(data));
    }

    logger(`API request successful: ${endpoint}`, 'info');
    return res;
  } catch (error) {
    logger(`Error during API request: ${error.message}`, 'error');
    throw error;
  }
}

// Registers global commands for the bot.
export async function InstallGlobalCommands(appId, commands) {
  const endpoint = `applications/${appId}/commands`;

  try {
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
    logger('Commands successfully registered.', 'info');
  } catch (err) {
    logger(`Failed to register commands: ${err.message}`, 'error');
  }
}

// Generates a timestamp in ISO UTC format.
export function generateTimestamp() {
  return new Date().toISOString();
}

// Deletes files matching a specific pattern from the current directory.
export function cleanFiles(pattern) {
  const files = fs.readdirSync('./').filter(file => file.includes(pattern));
  files.forEach(file => {
    fs.unlinkSync(file);
    logger(`Deleted file: ${file}`, 'info');
  });
  logger(`Deleted files with pattern "${pattern}": ${files}`, 'info');
}

// Validates if the session name is unique and meets length requirements.
export function validateSessionName(sessionName) {
  if (sessionName.length > 50) {
    return 'Session name must be no more than 50 characters.';
  }

  const sessionFolder = path.join(recordingsDir, sessionName);
  if (fs.existsSync(sessionFolder)) {
    return 'A session with this name already exists. Please choose a different name.';
  }

  return true;
}

// Creates a directory for the given session.
export function createSessionDirectory(sessionName) {
  const sessionFolder = path.join(recordingsDir, sessionName);
  fs.mkdirSync(sessionFolder, { recursive: true });
  logger(`Created directory for session: ${sessionName}`, 'info');
}
