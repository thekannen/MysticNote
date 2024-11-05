import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { REST, Routes, ApplicationCommandType, ApplicationCommandOptionType } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import config from '../src/config/config.js';
import { logger } from '../src/utils/logger.js';

// Ensure that APP_ID and DISCORD_TOKEN are set
if (!process.env.APP_ID || !process.env.DISCORD_TOKEN) {
  logger('Error: APP_ID and DISCORD_TOKEN must be set in the environment variables.', 'error');
  process.exit(1);
}

// Define commands using SlashCommandBuilder

const commands = [];

// Command for the bot to join the voice channel
const gazeCommand = new SlashCommandBuilder()
  .setName('gaze')
  .setDescription('The bot enters the channel, peering into the voices of the unseen.');

// Command for the bot to leave the voice channel
const leaveCommand = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('The bot vanishes, ending the magical vision.');

// Command to start recording voices in the channel
const beginScryingCommand = new SlashCommandBuilder()
  .setName('begin_scrying')
  .setDescription('Start recording the words spoken, capturing them as if seen through a crystal ball.')
  .addStringOption((option) =>
    option
      .setName('session')
      .setDescription(`The name of the session (up to ${config.sessionNameMaxLength} characters, must be unique)`)
      .setRequired(true)
      .setMaxLength(config.sessionNameMaxLength)
  );

// Command to end the recording session
const endScryingCommand = new SlashCommandBuilder()
  .setName('end_scrying')
  .setDescription('Cease recording, finalizing the vision.');

// Command to list all recorded sessions
const consultTheTextsCommand = new SlashCommandBuilder()
  .setName('consult_the_texts')
  .setDescription('Lists all the scrying sessions saved to the wizard\'s tome.');

// Command to receive a summary of a specific session
const revealSummaryCommand = new SlashCommandBuilder()
  .setName('reveal_summary')
  .setDescription('Receive a concise vision of the last scrying session.')
  .addStringOption((option) =>
    option
      .setName('session')
      .setDescription('The name of the session you wish to summarize.')
      .setRequired(true)
  );

// Command to delete a specific session's recordings and transcripts
const deleteSessionCommand = new SlashCommandBuilder()
  .setName('delete_session')
  .setDescription('Deletes all recordings and transcripts for a session. Use with caution!')
  .addStringOption((option) =>
    option
      .setName('session')
      .setDescription('The name of the session you wish to delete.')
      .setRequired(true)
  );

// Command to delete all sessions; requires explicit confirmation
const purgeCommand = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Deletes all recordings and transcripts for EVERY session. Use with extreme caution!')
  .addStringOption((option) =>
    option
      .setName('confirmation')
      .setDescription('Type "CONFIRM" to delete everything! This cannot be undone!')
      .setRequired(true)
  );

// Command to process a session (for debugging)
const processSessionCommand = new SlashCommandBuilder()
  .setName('process_session')
  .setDescription('Transcribe and summarize a session. Used for debugging!')
  .addStringOption((option) =>
    option
      .setName('session')
      .setDescription('The name of the session you wish to process.')
      .setRequired(true)
  );

// Add commands to the array
commands.push(
  gazeCommand,
  leaveCommand,
  beginScryingCommand,
  endScryingCommand,
  consultTheTextsCommand,
  revealSummaryCommand,
  completeVisionCommand,
  deleteSessionCommand,
  purgeCommand,
  processSessionCommand
);

// Convert commands to JSON format
const commandsJSON = commands.map((command) => command.toJSON());

// Register commands with Discord
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    logger('Started refreshing application (/) commands.', 'info');

    await rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commandsJSON });

    logger('Successfully reloaded application (/) commands.', 'info');
  } catch (error) {
    logger(`Error registering commands: ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');
  }
})();
