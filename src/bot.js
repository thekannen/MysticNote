import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { Client, GatewayIntentBits } from 'discord.js';
import { logger, verboseLog } from './utils/logger.js'; 
import { startRecording, stopRecording, isScryingSessionOngoing, getActiveConnection } from './services/recordingService.js';
import { setClient } from './utils/common.js';

import { joinVoiceChannelHandler } from './commands/gaze.js';
import { leaveVoiceChannelHandler } from './commands/leave.js';
import { transcribeAudioHandler } from './commands/beginScrying.js';
import { stopRecordingAndTranscribe } from './commands/endScrying.js';
import { consultTheTextsHandler } from './commands/consultTexts.js';
import { revealSummary, retrieveFullTranscription } from './commands/summary.js';
import { deleteSessionHandler, purgeHandler } from './commands/deletePurge.js';
import { processSessionHandler } from './commands/processSession.js';

// Initialize the Discord client with required intents
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

setClient(client);  // Store the client instance globally

// Event triggered once the bot successfully logs in
client.once('ready', () => {
  verboseLog(`Logged in as ${client.user.tag}`);
});

// Event listener for user join/leave in voice channel
client.on('voiceStateUpdate', async (oldState, newState) => {
  const voiceChannel = newState.channel || oldState.channel;

  // Check if the bot is in the voice channel
  if (!voiceChannel || !voiceChannel.members.has(client.user.id)) {
    logger('Bot is not connected to the channel.', 'info');
    return;
  }
  
  const userId = newState.member.id;
  const username = newState.member.user.username;

  // Check if a scrying session is currently active
  if (isScryingSessionOngoing()) {
    // If a user joins the channel, start recording
    if (!oldState.channelId && newState.channelId) {
      const connection = getActiveConnection(newState.guild.id); // Assuming getActiveConnection returns the current connection
      if (connection) {
        startRecording(connection, userId, username); // startRecording now accepts connection as a parameter
      } else {
        logger("No active connection found for the guild. Cannot start recording.", "error");
      }
    }
    // If a user leaves the channel, stop recording
    else if (oldState.channelId && !newState.channelId) {
      await stopRecording(userId);
    }
  }
});

// Command handler for bot interactions
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  try {
    const { commandName } = interaction;

    switch (commandName) {
      case 'gaze':
        verboseLog('Handling command: gaze', 'info');
        await joinVoiceChannelHandler(interaction);
        break;
      case 'leave':
        verboseLog('Handling command: leave', 'info');
        await leaveVoiceChannelHandler(interaction);
        break;
      case 'begin_scrying':
        verboseLog('Handling command: begin_scrying', 'info');
        await transcribeAudioHandler(interaction);
        break;
      case 'end_scrying':
        verboseLog('Handling command: end_scrying', 'info');
        await stopRecordingAndTranscribe(interaction);
        break;
      case 'consult_the_texts':
        verboseLog('Handling command: consult_the_texts', 'info');
        await consultTheTextsHandler(interaction);
        break;
      case 'reveal_summary':
        verboseLog('Handling command: reveal_summary', 'info');
        await revealSummary(interaction);
        break;
      case 'complete_vision':
        verboseLog('Handling command: complete_vision', 'info');
        await retrieveFullTranscription(interaction);
        break;
      case 'delete_session':
        verboseLog('Handling command: delete_session', 'info');
        await deleteSessionHandler(interaction);
        break;
      case 'process_session':
        verboseLog('Handling command: process_session', 'info');
        await processSessionHandler(interaction);
        break;
      case 'purge':
        verboseLog('Handling command: purge', 'info');
        await purgeHandler(interaction);
        break;
      default:
        verboseLog(`Unknown command: ${commandName}`, 'warning');
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    }
  } catch (error) {
    logger(`Error handling command "${interaction.commandName}": ${error.message}`, 'error');
    await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
  }
});

// Log in to Discord using the bot token
client.login(process.env.BOT_TOKEN).then(() => {
  logger('Successfully logged into Discord.', 'info');
}).catch((error) => {
  logger(`Failed to login to Discord: ${error.message}`, 'error');
});