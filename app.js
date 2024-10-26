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

  const { commandName } = interaction;

  if (commandName === 'join') {
    await joinVoiceChannelHandler(interaction);
  } else if (commandName === 'leave') {
    await leaveVoiceChannelHandler(interaction);
  } else if (commandName === 'transcribe') {
    await transcribeAudioHandler(interaction);
  } else if (commandName === 'stop') {
    await stopRecordingAndTranscribe(interaction);
  }
});

client.login(process.env.BOT_TOKEN);
