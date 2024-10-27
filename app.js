import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

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
client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

// Handle incoming commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName } = interaction;

    switch (commandName) {
      case 'gaze':
        await joinVoiceChannelHandler(interaction);
        break;
      case 'leave':
        await leaveVoiceChannelHandler(interaction);
        break;
      case 'begin_scrying':
        await transcribeAudioHandler(interaction);
        break;
      case 'end_scrying':
        await stopRecordingAndTranscribe(interaction);
        break;
      case 'consult_the_texts':
        await consultTheTextsHandler(interaction);
        break;
      case 'reveal_summary':
        await revealSummary(interaction);
        break;
      case 'complete_vision':
        await retrieveFullTranscription(interaction);
        break;
      case 'delete_session':
        await deleteSessionHandler(interaction);
        break;
      case 'purge':
        await purgeHandler(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (error) {
    console.error(`Error handling command "${interaction.commandName}":`, error);
    await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
  }
});

// Log into Discord with the bot token
client.login(process.env.BOT_TOKEN);