import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

import { joinVoiceChannelHandler } from './command/join.js';
import { leaveVoiceChannelHandler } from './command/leave.js';
import { transcribeAudioHandler } from './command/transcribe.js';
import { stopRecordingAndTranscribe } from './command/stop.js';
import { revealSummary, retrieveFullTranscription } from './command/summary.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

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
      case 'reveal_summary':
        await revealSummary(interaction);
        break;
      case 'complete_vision':
        await retrieveFullTranscription(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (error) {
    console.error(`Error handling command "${interaction.commandName}":`, error);
    await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
  }
});

client.login(process.env.BOT_TOKEN);
