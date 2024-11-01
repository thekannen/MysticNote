import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js'; // Custom logger utility
import config from '../config/config.js'; // Configuration file

// Define the directory where recordings are saved
const recordingsDir = path.join(getDirName(), '../../bin/recordings');

// Sends an API request to Discord with the specified endpoint and options
export async function DiscordRequest(endpoint, options) {
  const url = 'https://discord.com/api/v10/' + endpoint;

  // Stringify body if it exists
  if (options.body) options.body = JSON.stringify(options.body);

  try {
    // Send the API request with authorization headers and options
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`, // Authorization token for Discord
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'DND Scrying NoteTaker (https://github.com/thekannen/dnd-scrying-notetaker.git, 1.0.0)',
      },
      ...options,
    });

    // Log and throw an error if the request was unsuccessful
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

// Registers global commands with Discord for the bot.
export async function InstallGlobalCommands(appId, commands) {
  const endpoint = `applications/${appId}/commands`;

  try {
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
    logger('Commands successfully registered.', 'info');
  } catch (err) {
    logger(`Failed to register commands: ${err.message}`, 'error');
  }
}

// Helper to get the directory name of the current file
export function getDirName() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return __dirname;
}

// Generates a timestamp based on the server's local timezone for consistent file naming
export function generateTimestamp(forLogging = false) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

  if (forLogging) {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`; // Suitable for general file naming
}

// Deletes all files matching a specific pattern in the current directory
export function cleanFiles(pattern) {
  const files = fs.readdirSync('./').filter(file => file.includes(pattern));
  files.forEach(file => {
    fs.unlinkSync(file); // Delete each matching file
    logger(`Deleted file: ${file}`, 'info');
  });
  logger(`Deleted files with pattern "${pattern}": ${files}`, 'info');
}

// Validates session name length and uniqueness
export function validateSessionName(sessionName) {
  // Check if session name exceeds the max length set in config
  if (sessionName.length > config.sessionNameMaxLength) {
    return `Session name must be no more than ${config.sessionNameMaxLength} characters.`;
  }

  // Check if a session with this name already exists
  const sessionFolder = path.join(recordingsDir, sessionName);
  if (fs.existsSync(sessionFolder)) {
    return 'A session with this name already exists. Please choose a different name.';
  }

  return true;
}

// Creates a new directory for a session to store recordings and transcripts
export function createSessionDirectory(sessionName) {
  const sessionFolder = path.join(recordingsDir, sessionName);
  fs.mkdirSync(sessionFolder, { recursive: true });
  logger(`Created directory for session: ${sessionName}`, 'info');
}