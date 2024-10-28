import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { stopRecordingAndTranscribe } from '../commands/end_scrying.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let connection = null;
let ffmpegProcesses = {}; // Tracks ffmpeg processes for each user
let activeUsers = new Set(); // Tracks users actively being recorded
let scryingChannelId = null;
let currentSessionName = null;
let isScryingSessionActive = false;
let inactivityTimeout = null;

const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Sets the active voice connection
export function setConnection(conn) {
  connection = conn;
  logger('Connection has been established and stored in recording.js', 'info');
  resetInactivityTimer(); // Reset timer when connection is established
}

// Retrieves the active connection for a guild
export function getActiveConnection(guildId) {
  return connection?.joinConfig.guildId === guildId ? connection : null;
}

// Clears the connection when leaving the voice channel
export function clearConnection() {
  connection = null;
  logger('Connection has been cleared.', 'info');
  clearInactivityTimer(); // Stop the timer when connection is cleared
}

// Resets the inactivity timer based on audio activity
function resetInactivityTimer() {
  clearInactivityTimer();
  inactivityTimeout = setTimeout(() => {
    logger('No audio detected for 5 minutes. Ending scrying session due to inactivity.', 'info');
    endScryingSession(); // Ends the session if no audio activity within the limit
  }, INACTIVITY_LIMIT);
}

// Clears the inactivity timer
function clearInactivityTimer() {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }
}

// Ends the scrying session due to inactivity
async function endScryingSession() {
  if (isScryingSessionActive) {
    const channel = client.channels.cache.get(getScryingChannelId());

    if (!channel) {
      logger(`Channel with ID ${scryingChannelId} not found. Unable to send inactivity notification.`, 'error');
      return;
    }

    await channel.send('The scrying session has ended due to 5 minutes of inactivity.');
    await stopRecordingAndTranscribe(null, channel);

    // Clear connection and session state
    clearConnection();
    setScryingSessionActive(false);
    logger('Scrying session ended due to inactivity.', 'info');
  }
}

// Helper to get the active scrying channel ID
export function getScryingChannelId() {
  return scryingChannelId;
}

// Sets session name for recording
export function setSessionName(sessionName) {
  currentSessionName = sessionName;
}

// Gets the current session name
export function getSessionName() {
  return currentSessionName;
}

// Starts recording for a user and monitors audio activity
export async function startRecording(conn, userId, username) {
  if (!conn || !conn.receiver) {
    logger("Connection is not established or lacks a valid receiver. Cannot start recording.", 'error');
    return;
  }

  await stopRecording(userId); // Stops existing recording for the user if any

  if (!currentSessionName) {
    logger("No active session found. Cannot start recording.", 'error');
    return;
  }

  const sessionDir = path.join(__dirname, '../recordings', currentSessionName);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(sessionDir, `audio_${username}_${userId}_${timestamp}.wav`);

  try {
    const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    ffmpegProcesses[userId] = spawn('ffmpeg', [
      '-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', filePath
    ]);

    pcmStream.pipe(ffmpegProcesses[userId].stdin);

    pcmStream.on('data', () => resetInactivityTimer()); // Reset timer on each audio packet

    ffmpegProcesses[userId].on('close', () => {
      logger(`Recording finished for ${username}, saved as ${filePath}`, 'info');
      activeUsers.delete(userId);
      resetInactivityTimer(); // Reset inactivity timer on audio activity
    });

    activeUsers.add(userId);
  } catch (error) {
    logger(`Failed to start recording for user ${username}: ${error}`, 'error');
  }
}

// Stops recording for a specific user or all users
export async function stopRecording(userId = null) {
  return new Promise((resolve) => {
    if (userId) {
      if (!ffmpegProcesses[userId]) {
        logger(`No active recording found for userId: ${userId}`, 'info');
        resolve(null);
        return;
      }

      setTimeout(() => {
        if (ffmpegProcesses[userId] && ffmpegProcesses[userId].stdin) {
          ffmpegProcesses[userId].stdin.end();
          ffmpegProcesses[userId].on('close', () => {
            const filePath = ffmpegProcesses[userId].spawnargs[ffmpegProcesses[userId].spawnargs.length - 1];
            logger(`Stopped recording for userId: ${userId}, saved as ${filePath}`, 'info');
            delete ffmpegProcesses[userId];
            activeUsers.delete(userId);
            resetInactivityTimer();
            resolve({ filePath, userId });
          });
        } else {
          logger(`FFmpeg process for userId: ${userId} is no longer active.`, 'info');
          resolve(null);
        }
      }, 500);
    } else {
      const stopPromises = Object.keys(ffmpegProcesses).map(async (activeUserId) => {
        return new Promise((stopResolve) => {
          if (ffmpegProcesses[activeUserId] && ffmpegProcesses[activeUserId].stdin) {
            ffmpegProcesses[activeUserId].stdin.end();
            ffmpegProcesses[activeUserId].on('close', () => {
              const filePath = ffmpegProcesses[activeUserId].spawnargs[ffmpegProcesses[activeUserId].spawnargs.length - 1];
              logger(`Stopped recording for userId: ${activeUserId}, saved as ${filePath}`, 'info');
              delete ffmpegProcesses[activeUserId];
              activeUsers.delete(activeUserId);
              stopResolve({ filePath, activeUserId });
            });
          } else {
            logger(`FFmpeg process for userId: ${activeUserId} is no longer active.`, 'info');
            stopResolve(null);
          }
        });
      });

      Promise.all(stopPromises).then((results) => {
        logger('All active recordings have been stopped.', 'info');
        clearInactivityTimer();
        resolve(results);
      });
    }
  });
}

// Discord event listener for voice channel updates
client.on('voiceStateUpdate', async (oldState, newState) => {
  const voiceChannel = newState.channel || oldState.channel;

  if (!voiceChannel || !voiceChannel.members.has(client.user.id)) {
    logger('Bot is not connected to the channel.', 'info');
    return;
  }

  const userId = newState.member.id;
  const username = newState.member.user.username;

  if (!oldState.channelId && newState.channelId && isScryingSessionActive) {
    startRecording(connection, userId, username);
  } else if (oldState.channelId && !newState.channelId && isScryingSessionActive) {
    await stopRecording(userId);
  }
});

// Logs in to the Discord bot client
client.login(process.env.BOT_TOKEN);

// Toggles the scrying session state, including inactivity timer
export function setScryingSessionActive(isActive, channelId = null) {
  isScryingSessionActive = isActive;
  scryingChannelId = channelId; // Store channelId for later use in notifications
  isActive ? resetInactivityTimer() : clearInactivityTimer();
}

// Checks if the scrying session is ongoing
export function isScryingSessionOngoing() {
  return isScryingSessionActive;
}