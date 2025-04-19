// src/test-bot.js
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';

// Reconstruct __dirname in ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Always load the .env from one level up (project root)
const envPath = path.resolve(__dirname, '..', '.env');
console.log('Loading .env from', envPath);
dotenv.config({ path: envPath });

console.log('🟢 Running test-bot.js');

// Verify token
if (!process.env.DISCORD_TOKEN) {
  console.error('🔴 DISCORD_TOKEN is NOT set!');
  process.exit(1);
}
console.log('✅ DISCORD_TOKEN loaded');

// Minimal Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.destroy();
  process.exit(0);
});

client
  .login(process.env.DISCORD_TOKEN)
  .catch(err => {
    console.error('🔴 Failed to log in:', err.message);
    process.exit(1);
  });
