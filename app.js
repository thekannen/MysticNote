import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

import { joinVoiceChannelHandler } from './commands2/join.js';
import { leaveVoiceChannelHandler } from './commands2/leave.js';
import { transcribeAudioHandler } from './commands2/transcribe.js';
import { stopRecordingAndTranscribe } from './commands2/stop.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName } = interaction;

    switch (commandName) {
      case 'join':
        await joinVoiceChannelHandler(interaction);
        break;
      case 'leave':
        await leaveVoiceChannelHandler(interaction);
        break;
      case 'transcribe':
        await transcribeAudioHandler(interaction);
        break;
      case 'stop':
        await stopRecordingAndTranscribe(interaction);
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
