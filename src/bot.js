import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // Load environment variables at the very top

import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from './utils/logger.js';
import { setClient } from './utils/common.js';
import { handleReady } from './events/ready.js';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate.js';
import { handleInteractionCreate } from './events/interactionCreate.js';

// Validate required environment variables
if (!process.env.DISCORD_TOKEN) {
  logger('DISCORD_TOKEN is not set in the environment variables.', 'error');
  process.exit(1);
}

// Initialize the Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    // Add other intents if needed
  ],
});

setClient(client); // Store the client instance globally

// Event triggered once the bot successfully logs in
client.once('ready', handleReady);

// Event listener for user join/leave in voice channels
client.on('voiceStateUpdate', handleVoiceStateUpdate);

// Command handler for bot interactions
client.on('interactionCreate', handleInteractionCreate);

// Graceful shutdown
process.on('SIGINT', () => {
  logger('Received SIGINT, shutting down gracefully...', 'info');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger('Received SIGTERM, shutting down gracefully...', 'info');
  client.destroy();
  process.exit(0);
});

// Log in to Discord using the bot token
client
  .login(process.env.DISCORD_TOKEN)
  .then(() => {
    logger('Successfully logged into Discord.', 'info');
  })
  .catch((error) => {
    logger(`Failed to login to Discord: ${error.message}`, 'error');
  });
