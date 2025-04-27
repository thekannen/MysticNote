// Add at the very top of the file
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path as needed to reach your .env one level up
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs';
import { Collection } from 'discord.js';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';

const commands = new Collection();
const commandsPath = path.join(getDirName(), '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js') && file !== 'index.js');

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if (command && command.execute && command.data && command.data.name) {
    commands.set(command.data.name, command);
  } else {
    logger(`The command at ${file} is missing a required "data" or "execute" property.`, 'warn');
  }
}

export default commands;
