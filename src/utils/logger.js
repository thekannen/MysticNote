import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTimestamp } from './common.js';
import config from '../config/config.js';

// Get the directory name of the current module (ES modules compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
};

// Get the current log level from config or default to 'info'
const currentLogLevel = LOG_LEVELS[config.logLevel] ?? LOG_LEVELS.info;

// Get the hostname of the current system (useful for log identification)
const hostname = os.hostname();

// Define the path for the logs directory, configurable via config
const logsDir = config.logsDirectory
  ? path.resolve(config.logsDirectory)
  : path.join(__dirname, '../bin/logs');

// Ensure the logs directory exists, creating it if necessary
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Logs a message to the console and a file, based on the log level.
 *
 * @param {string} message - The message to log.
 * @param {'error' | 'warn' | 'info' | 'verbose' | 'debug'} level - The log level of the message.
 */
export function logger(message, level = 'info') {
  const logLevel = LOG_LEVELS[level];
  if (logLevel === undefined) {
    console.error(`Invalid log level: ${level}`);
    return;
  }

  // Only log messages that are at or above the current log level
  if (logLevel <= currentLogLevel) {
    // Create a timestamp for the log entry
    const timestamp = generateTimestamp(true);

    // Format the log entry with a standardized structure
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    // Output log entry to the console
    console.log(logEntry);

    // Generate the log file name based on the current date (one per day)
    const date = new Date();
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const logFileName = `ScryingBot_${hostname}_${dateString}.log`;
    const logFilePath = path.join(logsDir, logFileName);

    // Append the log entry to the daily log file asynchronously
    fs.promises
      .appendFile(logFilePath, logEntry + '\n', 'utf8')
      .catch((error) => {
        // Log any errors to the console
        console.error(`Failed to write log to file: ${error.message}`);
      });
  }
}