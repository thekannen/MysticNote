import fs from 'fs';
import path from 'path';
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
