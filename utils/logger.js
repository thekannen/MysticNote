// Import required modules
import fs from 'fs';
import os from 'os';
import path from 'path';
import { format } from 'date-fns';

const hostname = os.hostname();
const logsDir = path.join(path.resolve(), 'logs');

// Ensure the logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger function to log messages to a file and console
export function logger(message, type = 'info') {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;

  // Output to console
  console.log(logEntry);

  // Generate log file name for the current day
  const logFileName = `${hostname}_${format(new Date(), 'yyyy-MM-dd')}.log`;
  const logFilePath = path.join(logsDir, logFileName);

  // Append the log entry to the daily log file
  fs.appendFileSync(logFilePath, logEntry + '\n', 'utf8');
}

// Usage example
// logger('This is an info message.', 'info');
// logger('This is a warning message.', 'warn');
// logger('This is an error message.', 'error');