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

let connection = null; // Stores the current voice connection
let ffmpegProcesses = {}; // Stores ffmpeg processes for each user
let activeUsers = new Set(); // Tracks users actively being recorded
let scryingChannelId = null;
let currentSessionName = null;
let isScryingSessionActive = false;
let inactivityTimeout = null; // Timer for session inactivity

const INACTIVITY_LIMIT = 3000; // 5 minutes in milliseconds

// Set the active voice connection
export function setConnection(conn) {
  connection = conn;
  logger('Connection has been established and stored in recording.js', 'info');
  resetInactivityTimer(); // Reset timer when connection is established
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
  logger('Connection has been cleared.', 'info');
  clearInactivityTimer(); // Stop the timer when connection is cleared
}

// Initialize or reset the inactivity timer
function resetInactivityTimer() {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
  }

  inactivityTimeout = setTimeout(() => {
    logger('No audio detected for 5 minutes. Ending scrying session due to inactivity.', 'info');
    endScryingSession(); // Pass interaction to notify the channel
  }, INACTIVITY_LIMIT);
}

// Clear the inactivity timer
function clearInactivityTimer() {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }
}

// End the scrying session due to inactivity
async function endScryingSession() {
  if (isScryingSessionActive) {
    const channelId = getScryingChannelId();
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
      logger(`Channel with ID ${channelId} not found. Unable to send inactivity notification.`, 'error');
      return;
    }

    // Notify the channel that the session ended due to inactivity
    await channel.send('The scrying session has ended due to 5 minutes of inactivity.');

    // Call the stop and transcribe helper with the mock interaction and channelId
    await stopRecordingAndTranscribe(null, channelId);

    // Clear connection and session state
    clearConnection();
    setScryingSessionActive(false);
    logger('Scrying session ended due to inactivity.', 'info');
  }
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
    logger("Connection is not established. Cannot start recording.", 'error');
    return;
  }

  if (!conn.receiver) {
    logger("Connection does not have a valid receiver. Cannot start recording.", 'error');
    return;
  }

  await stopRecording(userId); // Stop existing recording for the user, if any

  if (!currentSessionName) {
    logger("No active session found. Cannot start recording.", 'error');
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
      '-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', filePath
    ]);

    pcmStream.pipe(ffmpegProcesses[userId].stdin);

    ffmpegProcesses[userId].on('close', () => {
      logger(`Recording finished for ${username}, saved as ${filePath}`, 'info');
      activeUsers.delete(userId);
      resetInactivityTimer(); // Reset inactivity timer on audio activity
    });

    activeUsers.add(userId);
    resetInactivityTimer(); // Reset inactivity timer whenever recording starts

    pcmStream.on('end', () => {
      logger(`PCM stream ended for user ${userId}`, 'info');
    });

    pcmStream.on('finish', () => {
      logger(`PCM stream finished for user ${userId}`, 'info');
    });

    pcmStream.on('error', (error) => {
      logger(`PCM stream error for ${username}: ${error}`, 'error');
    });
  } catch (error) {
    logger(`Failed to start recording for user ${username}: ${error}`, 'error');
  }
}

// Stop recording for a user or all users
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

// Event listener for users joining or leaving a voice channel
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

client.login(process.env.BOT_TOKEN);

export function setScryingSessionActive(isActive, channelId = null) {
  isScryingSessionActive = isActive;
  scryingChannelId = channelId; // Store channelId for later use in notifications

  if (isActive) {
    resetInactivityTimer();
  } else {
    clearInactivityTimer();
  }
}

export function getScryingChannelId() {
  return scryingChannelId;
}

export function isScryingSessionOngoing() {
  return isScryingSessionActive;
}