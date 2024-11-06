import fs from 'fs';
import path from 'path';
import { DateTime } from 'luxon';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch'; // Import fetch for Node.js versions below 18
import { logger } from './logger.js'; // Custom logger utility
import config from '../config/config.js'; // Configuration file

// Helper to get the directory name of the current file
export function getDirName() {
  return path.dirname(fileURLToPath(import.meta.url));
}

// Define the directory where recordings are saved
const recordingsDir = path.join(getDirName(), '../../bin/recordings');

let clientInstance = null;

// Sends an API request to Discord with the specified endpoint and options
export async function DiscordRequest(endpoint, options = {}) {
  const url = `https://discord.com/api/v10/${endpoint}`;

  // Stringify body if it's an object and Content-Type is application/json
  if (options.body && options.headers?.['Content-Type'] === 'application/json') {
    options.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'DND Scrying NoteTaker (https://github.com/thekannen/dnd-scrying-notetaker.git, ${config.botVersion})',
      },
      ...options,
    });

    const data = await res.json();

    if (!res.ok) {
      logger(`API request failed with status ${res.status}: ${JSON.stringify(data)}`, 'error');
      throw new Error(`API request failed with status ${res.status}: ${JSON.stringify(data)}`);
    }

    logger(`API request successful: ${endpoint}`, 'info');
    return data;
  } catch (error) {
    logger(`Error during API request: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Generates a timestamp based on the configured timezone for consistent file naming.
 * @param {boolean} forLogging - If true, returns a timestamp suitable for logging.
 * @returns {string} - The formatted timestamp.
 */
export function generateTimestamp(forLogging = false) {
  const timezone = config.timezone && config.timezone !== 'local' ? config.timezone : undefined;
  const now = timezone ? DateTime.now().setZone(timezone) : DateTime.now();

  if (forLogging) {
    // Return a timestamp suitable for logging
    return now.toFormat('yyyy-MM-dd HH:mm:ss');
  }

  // Return a timestamp suitable for file naming (avoid characters that are invalid in file names)
  return now.toFormat('yyyy-MM-dd\'T\'HH-mm-ss');
}

// Deletes all files matching a specific pattern in the specified directory
export function cleanFiles(directory, pattern) {
  const dirPath = path.resolve(directory);
  const files = fs.readdirSync(dirPath).filter(file => file.includes(pattern));

  files.forEach(file => {
    try {
      fs.unlinkSync(path.join(dirPath, file));
      logger(`Deleted file: ${file}`, 'info');
    } catch (error) {
      logger(`Error deleting file ${file}: ${error.message}`, 'error');
    }
  });

  logger(`Deleted files with pattern "${pattern}" in directory "${directory}": ${files}`, 'info');
}

// Validates session name length and uniqueness
export function validateSessionName(sessionName) {
  if (sessionName.length > config.sessionNameMaxLength) {
    const message = `Session name must be no more than ${config.sessionNameMaxLength} characters.`;
    logger(message, 'verbose');
    throw new Error(message);
  }

  const sessionFolder = path.join(recordingsDir, sessionName);
  if (fs.existsSync(sessionFolder)) {
    const message = 'A session with this name already exists. Please choose a different name.';
    logger(message, 'verbose');
    throw new Error(message);
  }

  return true;
}

// Creates a new directory for a session to store recordings and transcripts
export function createSessionDirectory(sessionName) {
  const sessionFolder = path.join(recordingsDir, sessionName);
  try {
    fs.mkdirSync(sessionFolder, { recursive: true });
    logger(`Created directory for session: ${sessionName}`, 'info');
  } catch (error) {
    logger(`Error creating session directory: ${error.message}`, 'error');
    throw error;
  }
}

// Set the Discord client instance
export function setClient(client) {
  clientInstance = client;
}

// Get the Discord client instance
export function getClient() {
  if (!clientInstance) {
    throw new Error('Client has not been initialized.');
  }
  return clientInstance;
}
