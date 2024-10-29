import fs from 'fs';
import os from 'os';
import path from 'path';
import { generateTimestamp } from './common.js';

// Get the hostname of the current system (useful for log identification)
const hostname = os.hostname();

// Define the path for the logs directory
const logsDir = path.join(path.resolve(), '../bin/logs');

// Ensure the logs directory exists, creating it if necessary
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger function to log messages to both a file and the console
export function logger(message, type = 'info') {
  // Create a timestamp for the log entry
  const timestamp = generateTimestamp(true);

  // Format the log entry with a standardized structure
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;

  // Output log entry to the console
  console.log(logEntry);

  // Generate the log file name based on the current date and hostname
  const logFileName = `ScryingBot_${hostname}_${generateTimestamp()}.log`;
  const logFilePath = path.join(logsDir, logFileName);

  // Append the log entry to the daily log file, creating a new line for each entry
  fs.appendFileSync(logFilePath, logEntry + '\n', 'utf8');
}

// Usage examples:
// logger('This is an info message.', 'info');  // Logs an info message
// logger('This is a warning message.', 'warn'); // Logs a warning message
// logger('This is an error message.', 'error'); // Logs an error message