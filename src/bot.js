// src/bot.js
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import path from 'path';
import { fileURLToPath } from 'url';

// ─── ESM __dirname shim & .env load ────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
console.log('🪄 [BOOT] cwd=', __dirname);

// ─── Check for Discord token ───────────────────────────────────────────────────
if (!process.env.DISCORD_TOKEN) {
  console.error('🔴 DISCORD_TOKEN not set; cannot start bot.');
  process.exit(1);
}
console.log('🪄 [BOOT] DISCORD_TOKEN found');

// ─── Imports & setup ───────────────────────────────────────────────────────────
import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from './utils/logger.js';
import { setClient } from './utils/common.js';
import { handleReady } from './events/ready.js';
import { handleVoiceStateUpdate } from './events/voiceStateUpdate.js';
import { handleInteractionCreate } from './events/interactionCreate.js';

// ─── Instantiate client ────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
setClient(client);

// ─── Wire up events ────────────────────────────────────────────────────────────
client.once('ready', handleReady);
client.on('voiceStateUpdate', handleVoiceStateUpdate);
client.on('interactionCreate', handleInteractionCreate);

// ─── Graceful shutdown ─────────────────────────────────────────────────────────
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    logger(`Received ${sig}, shutting down…`, 'info');
    client.destroy();
    process.exit(0);
  });
}

// ─── Login ─────────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log('🪄 [LOGIN] login() promise resolved');
    logger('✅ Successfully logged into Discord.', 'info');
  })
  .catch(err => {
    console.error('❌ [LOGIN] login() failed:', err.message);
    logger(`🔴 Failed to login: ${err.message}`, 'error');
    process.exit(1);
  });
