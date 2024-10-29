import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';  // Loads environment variables from .env file
import { logger } from './utils/logger.js'; 

// Import handlers for each bot command
import { joinVoiceChannelHandler } from './commands/gaze.js';
import { leaveVoiceChannelHandler } from './commands/leave.js';
import { transcribeAudioHandler } from './commands/beginScrying.js';
import { stopRecordingAndTranscribe } from './commands/endScrying.js';
import { consultTheTextsHandler } from './commands/consultTexts.js';
import { revealSummary, retrieveFullTranscription } from './commands/summary.js';
import { deleteSessionHandler, purgeHandler } from './commands/deletePurge.js';

// Initialize the Discord client with voice and guild interaction intents
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

// Event triggered once the bot successfully logs in
client.once('ready', () => {
  logger(`Logged in as ${client.user.tag}`, 'info');
});

// Event listener for handling incoming commands
client.on('interactionCreate', async (interaction) => {
  // Check if the interaction is a command, exit if not
  if (!interaction.isCommand()) return;

  try {
    // Extract command name from the interaction
    const { commandName } = interaction;

    // Handle the command based on its name
    switch (commandName) {
      case 'gaze':
        logger('Handling command: gaze', 'info');
        await joinVoiceChannelHandler(interaction);  // Joins the voice channel
        break;
      case 'leave':
        logger('Handling command: leave', 'info');
        await leaveVoiceChannelHandler(interaction);  // Leaves the voice channel
        break;
      case 'begin_scrying':
        logger('Handling command: begin_scrying', 'info');
        await transcribeAudioHandler(interaction);  // Begins scrying session (recording)
        break;
      case 'end_scrying':
        logger('Handling command: end_scrying', 'info');
        await stopRecordingAndTranscribe(interaction);  // Ends scrying session (transcription)
        break;
      case 'consult_the_texts':
        logger('Handling command: consult_the_texts', 'info');
        await consultTheTextsHandler(interaction);  // Lists available scrying sessions
        break;
      case 'reveal_summary':
        logger('Handling command: reveal_summary', 'info');
        await revealSummary(interaction);  // Reveals summary of a scrying session
        break;
      case 'complete_vision':
        logger('Handling command: complete_vision', 'info');
        await retrieveFullTranscription(interaction);  // Retrieves full transcription of a session
        break;
      case 'delete_session':
        logger('Handling command: delete_session', 'info');
        await deleteSessionHandler(interaction);  // Deletes a specific scrying session
        break;
      case 'purge':
        logger('Handling command: purge', 'info');
        await purgeHandler(interaction);  // Deletes all scrying sessions
        break;
      default:
        // Handles unknown commands
        logger(`Unknown command: ${commandName}`, 'warning');
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (error) {
    // Log any errors encountered during command processing
    logger(`Error handling command "${interaction.commandName}": ${error.message}`, 'error');
    // Notify the user of the error if possible
    await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
  }
});

// Log in to Discord using the bot token
client.login(process.env.BOT_TOKEN).then(() => {
  logger('Successfully logged into Discord.', 'info');
}).catch((error) => {
  logger(`Failed to login to Discord: ${error.message}`, 'error');  // Log an error if login fails
});