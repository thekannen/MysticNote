import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

const commands = [];
const commandsPath = path.resolve('./src/commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const filePath = path.join(commandsPath, file);
  const { data } = await import(pathToFileURL(filePath).href);
  commands.push(data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands }
);
console.log(`✅ Registered ${commands.length} commands to guild ${process.env.GUILD_ID}`);