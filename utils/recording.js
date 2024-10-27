import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let connection = null; // Stores the current voice connection
let ffmpegProcesses = {}; // Stores ffmpeg processes for each user
let activeUsers = new Set(); // Tracks users actively being recorded
let currentSessionName = null;
let isScryingSessionActive = false;

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

// Clear the connection when leaving the channel
export function clearConnection() {
  connection = null;
  console.log('Connection has been cleared.');
}

export function setSessionName(sessionName) {
  currentSessionName = sessionName;
}

export function getSessionName() {
  return currentSessionName;
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

  // Create the file directory if it does not exist
  if (!currentSessionName) {
    console.error("No active session found. Cannot start recording.");
    return;
  }
  
  const sessionDir = path.join(__dirname, '../recordings', currentSessionName);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Prepare streams for recording
  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(sessionDir, `audio_${username}_${userId}_${timestamp}.wav`);

  try {
    const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    // Spawn ffmpeg process for recording PCM stream to a file
    ffmpegProcesses[userId] = spawn('ffmpeg', [
      '-y','-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', filePath
    ]);

    pcmStream.pipe(ffmpegProcesses[userId].stdin);

    // Handle recording completion
    ffmpegProcesses[userId].on('close', () => {
      console.log(`Recording finished for ${username}, saved as ${filePath}`);
      activeUsers.delete(userId); // Remove the user from active recording list
    });

    activeUsers.add(userId); // Add user to active recording list

    pcmStream.on('end', () => {
      console.log(`PCM stream ended for user ${userId}`);
    });
    
    pcmStream.on('finish', () => {
      console.log(`PCM stream finished for user ${userId}`);
    });    

    // Handle PCM stream errors
    pcmStream.on('error', (error) => {
      console.error(`PCM stream error for ${username}:`, error);
    });
  } catch (error) {
    console.error(`Failed to start recording for user ${username}:`, error);
  }
}

// Stop recording for a user or all users
export async function stopRecording(userId = null) {
  return new Promise((resolve) => {
    if (userId) {
      // Stop a specific user's recording
      if (!ffmpegProcesses[userId]) {
        console.log(`No active recording found for userId: ${userId}`);
        resolve(null);
        return;
      }

      // Adding a small delay before ending the stream
      setTimeout(() => {
        if (ffmpegProcesses[userId] && ffmpegProcesses[userId].stdin) {
          ffmpegProcesses[userId].stdin.end();
          ffmpegProcesses[userId].on('close', () => {
            const filePath = ffmpegProcesses[userId].spawnargs[ffmpegProcesses[userId].spawnargs.length - 1];
            console.log(`Stopped recording for userId: ${userId}, saved as ${filePath}`);
            delete ffmpegProcesses[userId];
            activeUsers.delete(userId);
            resolve({ filePath, userId });
          });
        } else {
          console.log(`FFmpeg process for userId: ${userId} is no longer active.`);
          resolve(null);
        }
      }, 500); // Adjust delay time as necessary (e.g., 500 ms)
    } else {
      // Stop all active recordings
      const stopPromises = Object.keys(ffmpegProcesses).map(async (activeUserId) => {
        return new Promise((stopResolve) => {
          if (ffmpegProcesses[activeUserId] && ffmpegProcesses[activeUserId].stdin) {
            ffmpegProcesses[activeUserId].stdin.end();
            ffmpegProcesses[activeUserId].on('close', () => {
              const filePath = ffmpegProcesses[activeUserId].spawnargs[ffmpegProcesses[activeUserId].spawnargs.length - 1];
              console.log(`Stopped recording for userId: ${activeUserId}, saved as ${filePath}`);
              delete ffmpegProcesses[activeUserId];
              activeUsers.delete(activeUserId);
              stopResolve({ filePath, activeUserId });
            });
          } else {
            console.log(`FFmpeg process for userId: ${activeUserId} is no longer active.`);
            stopResolve(null);
          }
        });
      });

      Promise.all(stopPromises).then((results) => {
        console.log('All active recordings have been stopped.');
        resolve(results);
      });
    }
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
  if (!oldState.channelId && newState.channelId && isScryingSessionActive) {
    startRecording(connection, userId, username);
  }
  // User left the voice channel
  else if (oldState.channelId && !newState.channelId && isScryingSessionActive) {
    await stopRecording(userId);
  }
});

// Log in to Discord with the bot token
client.login(process.env.BOT_TOKEN);

// Manage session state
export function setScryingSessionActive(isActive) {
  isScryingSessionActive = isActive;
}

export function isScryingSessionOngoing() {
  return isScryingSessionActive;
}
