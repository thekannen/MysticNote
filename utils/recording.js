import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { generateTimestamp } from '../utils.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let connection = null; // Stores the current voice connection
let ffmpegProcesses = {}; // Stores ffmpeg processes for each user
let activeUsers = new Set(); // Tracks users actively being recorded
let sessionFiles = []; // Stores session recording files

// Set the active voice connection
export function setConnection(conn) {
  connection = conn;
  console.log('Connection has been established and stored in recording.js');
}

// Get the active connection for the guild
export function getActiveConnection(guildId) {
  if (connection && connection.joinConfig.guildId === guildId) {
    return connection;
  }
  return null; // No active connection for the specified guild
}

// Start recording for a user
export async function startRecording(conn, userId, username) {
  if (!conn) {
    console.error("Connection is not established. Cannot start recording.");
    return;
  }

  // Check if connection has a valid receiver
  if (!conn.receiver) {
    console.error("Connection does not have a valid receiver. Cannot start recording.");
    return;
  }

  await stopRecording(userId); // Stop existing recording for the user, if any

  // Create the directory for recordings if it does not exist
  const recordingsDir = path.join(__dirname, '../recordings');
  if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

  const timestamp = generateTimestamp().replace(/[:.]/g, '-');
  const filePath = path.join(recordingsDir, `audio_${username}_${userId}_${timestamp}.wav`);

  // Prepare streams for recording
  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  try {
    const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    // Spawn ffmpeg process for recording PCM stream to a file
    ffmpegProcesses[userId] = spawn('ffmpeg', [
      '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', filePath
    ]);

    pcmStream.pipe(ffmpegProcesses[userId].stdin);

    // Handle recording completion
    ffmpegProcesses[userId].on('close', () => {
      console.log(`Recording finished for ${username}, saved as ${filePath}`);
      sessionFiles.push(filePath); // Add the recording to session files
      activeUsers.delete(userId); // Remove the user from active recording list
    });

    activeUsers.add(userId); // Add user to active recording list

    // Handle PCM stream errors
    pcmStream.on('error', (error) => {
      console.error(`PCM stream error for ${username}:`, error);
    });
  } catch (error) {
    console.error(`Failed to start recording for user ${username}:`, error);
  }
}

// Stop recording for a user
export async function stopRecording(userId) {
  return new Promise((resolve) => {
    if (!ffmpegProcesses[userId]) {
      console.log(`No active recording found for userId: ${userId}`);
      resolve(null);
      return;
    }

    ffmpegProcesses[userId].stdin.end(); // End the ffmpeg input stream
    ffmpegProcesses[userId].on('close', () => {
      const filePath = ffmpegProcesses[userId].spawnargs[ffmpegProcesses[userId].spawnargs.length - 1];
      console.log(`Stopped recording for userId: ${userId}, saved as ${filePath}`);
      delete ffmpegProcesses[userId]; // Remove the process entry
      activeUsers.delete(userId); // Remove user from active list
      sessionFiles.push(filePath); // Track the recording in session files
      resolve({ filePath, userId });
    });
  });
}

// Event listener for users joining or leaving a voice channel
client.on('voiceStateUpdate', async (oldState, newState) => {
  const voiceChannel = newState.channel || oldState.channel;

  // If the bot is not connected to a voice channel, exit
  if (!voiceChannel || !voiceChannel.members.has(client.user.id)) {
    console.log('Bot is not connected to the channel.');
    return;
  }

  const userId = newState.member.id;
  const username = newState.member.user.username;

  // User joined the voice channel
  if (!oldState.channelId && newState.channelId) {
    startRecording(connection, userId, username);
  }
  // User left the voice channel
  else if (oldState.channelId && !newState.channelId) {
    await stopRecording(userId);
  }
});

// Log in to Discord with the bot token
client.login(process.env.BOT_TOKEN);

// Clear session files for a new scrying session
export function clearSessionFiles() {
  sessionFiles = []; // Reset session file tracking
}

// Get the current session files
export function getSessionFiles() {
  return [...sessionFiles]; // Return a copy of session files
}
