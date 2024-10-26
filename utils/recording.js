import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { generateTimestamp } from '../utils.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let connection = null;
let ffmpegProcesses = {};
let activeUsers = new Set();

export function setConnection(conn) {
  connection = conn;
  console.log('Connection has been established and stored in recording.js');
}

export async function startRecording(conn, userId, username) {
  if (!conn) {
    console.error("Connection is not established. Cannot start recording.");
    return;
  }

  // Ensure any existing processes or streams are cleared
  await stopRecording(userId);

  console.log(`Starting new recording for ${username} (ID: ${userId})`);

  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
  const pcmStream = userStream.pipe(opusDecoder);

  const recordingsDir = path.join(__dirname, '../recordings');
  if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

  const timestamp = generateTimestamp().replace(/[:.]/g, '-');
  const filePath = path.join(recordingsDir, `audio_${userId}_${timestamp}.wav`);

  ffmpegProcesses[userId] = spawn('ffmpeg', [
    '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', filePath
  ]);

  pcmStream.pipe(ffmpegProcesses[userId].stdin);

  ffmpegProcesses[userId].on('close', () => {
    console.log(`Recording finished for ${username}, saved as ${filePath}`);
    activeUsers.delete(userId);
  });

  ffmpegProcesses[userId].on('error', (error) => console.error('FFmpeg error:', error));
  activeUsers.add(userId);

  pcmStream.on('error', (error) => {
    console.error(`PCM stream error for ${username}:`, error);
  });
}

export async function stopRecording(userId) {
  return new Promise((resolve) => {
    if (!ffmpegProcesses[userId]) {
      console.log(`No active recording found for userId: ${userId}`);
      resolve(null);
      return;
    }

    if (!ffmpegProcesses[userId].killed) {
      ffmpegProcesses[userId].stdin.end();
      ffmpegProcesses[userId].on('close', () => {
        const filePath = ffmpegProcesses[userId].spawnargs[ffmpegProcesses[userId].spawnargs.length - 1];
        
        console.log(`Stopped recording for userId: ${userId}, saved as ${filePath}`);
        
        // Cleanup user processes
        delete ffmpegProcesses[userId];
        activeUsers.delete(userId);

        resolve({ filePath, userId });
      });
    } else {
      console.log(`Stream for userId: ${userId} is already closed.`);
      resolve(null);
    }
  });
}

// Event handler for user join/leave
client.on('voiceStateUpdate', async (oldState, newState) => {
  const voiceChannel = newState.channel || oldState.channel;
  if (!voiceChannel || !voiceChannel.members.has(client.user.id)) {
    console.log('Bot is not connected to the channel.');
    return;
  }

  const userId = newState.member.id;
  const username = newState.member.user.username;

  if (!oldState.channelId && newState.channelId) {
    // User joined the channel
    console.log(`${username} has joined the channel. Starting recording for them.`);
    await stopRecording(userId); // Ensure any lingering state is reset
    startRecording(connection, userId, username);
  } else if (oldState.channelId && !newState.channelId) {
    // User left the channel
    console.log(`${username} has left the channel. Stopping recording for them.`);
    await stopRecording(userId);
  }
});

// Log in the bot
client.login(process.env.BOT_TOKEN);
