import fs from 'fs';
import path from 'path';
import { getDirName } from '../utils/common.js';

// Define the path to the configuration file
const configPath = path.join(getDirName(), 'conf.json');

let config = {};
try {
  // Attempt to read and parse the configuration file
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  // Log an error if the configuration file fails to load
  console.error("Error loading configuration:", error);
  process.exit(1); // Exit the process to prevent further issues
}

// Export the parsed configuration object for use across the app
export default config;