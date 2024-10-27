import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { logger } from './utils/logger.js';

import { joinVoiceChannelHandler } from './commands/gaze.js';
import { leaveVoiceChannelHandler } from './commands/leave.js';
import { transcribeAudioHandler } from './commands/begin_scrying.js';
import { stopRecordingAndTranscribe } from './commands/end_scrying.js';
import { consultTheTextsHandler } from './commands/consult_texts.js';
import { revealSummary, retrieveFullTranscription } from './commands/summary.js';
import { deleteSessionHandler, purgeHandler } from './commands/delete_purge.js';

// Initialize Discord client with required intents for voice and guild interactions
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

// Log bot's username upon successful login
client.once('ready', () => {
  logger(`Logged in as ${client.user.tag}`, 'info');
});

// Handle incoming commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName } = interaction;
    logger(`Received command: ${commandName}`, 'info');

    switch (commandName) {
      case 'gaze':
        logger('Handling command: gaze', 'info');
        await joinVoiceChannelHandler(interaction);
        break;
      case 'leave':
        logger('Handling command: leave', 'info');
        await leaveVoiceChannelHandler(interaction);
        break;
      case 'begin_scrying':
        logger('Handling command: begin_scrying', 'info');
        await transcribeAudioHandler(interaction);
        break;
      case 'end_scrying':
        logger('Handling command: end_scrying', 'info');
        await stopRecordingAndTranscribe(interaction);
        break;
      case 'consult_the_texts':
        logger('Handling command: consult_the_texts', 'info');
        await consultTheTextsHandler(interaction);
        break;
      case 'reveal_summary':
        logger('Handling command: reveal_summary', 'info');
        await revealSummary(interaction);
        break;
      case 'complete_vision':
        logger('Handling command: complete_vision', 'info');
        await retrieveFullTranscription(interaction);
        break;
      case 'delete_session':
        logger('Handling command: delete_session', 'info');
        await deleteSessionHandler(interaction);
        break;
      case 'purge':
        logger('Handling command: purge', 'info');
        await purgeHandler(interaction);
        break;
      default:
        logger(`Unknown command: ${commandName}`, 'warning');
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (error) {
    logger(`Error handling command "${interaction.commandName}": ${error.message}`, 'error');
    await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
  }
});

// Log into Discord with the bot token
client.login(process.env.BOT_TOKEN).then(() => {
  logger('Successfully logged into Discord.', 'info');
}).catch((error) => {
  logger(`Failed to login to Discord: ${error.message}`, 'error');
});
