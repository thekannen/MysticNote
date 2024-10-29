import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import config from '../config/config.js';
import { Client, GatewayIntentBits } from 'discord.js';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';
import { stopRecordingAndTranscribe } from '../commands/endScrying.js';

// Directory for storing recordings
const sessionDir = path.join(getDirName(), '../../bin/recordings', currentSessionName);

// Initialize the Discord client with specific intents
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

// Variables to manage recording session state
let connection = null;
let ffmpegProcesses = {}; // Stores FFmpeg processes for each user
let activeUsers = new Set(); // Tracks users currently being recorded
let scryingChannelId = null;
let currentSessionName = null;
let isScryingSessionActive = false;
let inactivityTimeout = null;

// Set the inactivity limit in milliseconds based on configuration
const INACTIVITY_LIMIT = config.inactivityTimeoutMinutes * 60 * 1000;

// Sets the active voice connection
export function setConnection(conn) {
  connection = conn;
  logger('Connection has been established and stored in recording.js', 'info');
  resetInactivityTimer(); // Resets the timer each time a new connection is made
}

// Retrieves the active connection for a given guild
export function getActiveConnection(guildId) {
  return connection?.joinConfig.guildId === guildId ? connection : null;
}

// Clears the active connection when leaving the channel
export function clearConnection() {
  connection = null;
  logger('Connection has been cleared.', 'info');
  clearInactivityTimer(); // Stops the timer when connection is cleared
}

// Resets the inactivity timer, logging out if no audio is detected within the set limit
function resetInactivityTimer() {
  clearInactivityTimer();
  inactivityTimeout = setTimeout(() => {
    logger(`No audio detected for ${config.inactivityTimeoutMinutes} minutes. Ending scrying session due to inactivity.`, 'info');
    endScryingSession(); // Ends the session if no audio is detected within the inactivity limit
  }, INACTIVITY_LIMIT);
}

// Clears the inactivity timer
function clearInactivityTimer() {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }
}

// Ends the scrying session if no audio is detected, sends a notification to the channel
async function endScryingSession() {
  if (isScryingSessionActive) {
    const channel = client.channels.cache.get(getScryingChannelId());

    if (!channel) {
      logger(`Channel with ID ${scryingChannelId} not found. Unable to send inactivity notification.`, 'error');
      return;
    }

    await channel.send(`The scrying session has ended due to ${config.inactivityTimeoutMinutes} minutes of inactivity.`);
    await stopRecordingAndTranscribe(null, channel);

    logger('Scrying session ended due to inactivity.', 'info');
  }
}

// Helper to retrieve the active scrying channel ID
export function getScryingChannelId() {
  return scryingChannelId;
}

// Sets the session name for the current recording
export function setSessionName(sessionName) {
  currentSessionName = sessionName;
}

// Retrieves the current session name
export function getSessionName() {
  return currentSessionName;
}

// Starts recording for a user and monitors audio activity to reset inactivity timer
export async function startRecording(conn, userId, username) {
  if (!conn || !conn.receiver) {
    logger("Connection is not established or lacks a valid receiver. Cannot start recording.", 'error');
    return;
  }

  await stopRecording(userId); // Stops any existing recording for the user if already active

  if (!currentSessionName) {
    logger("No active session found. Cannot start recording.", 'error');
    return;
  }

  // Ensures the session directory exists
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  // Prepare decoder and define file path for user's audio recording
  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(sessionDir, `audio_${username}_${userId}_${timestamp}.wav`);

  try {
    const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    // Start FFmpeg process to capture PCM stream as an audio file
    ffmpegProcesses[userId] = spawn('ffmpeg', [
      '-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', filePath
    ]);

    pcmStream.pipe(ffmpegProcesses[userId].stdin);

    // Resets inactivity timer with each audio packet received
    pcmStream.on('data', () => resetInactivityTimer());

    ffmpegProcesses[userId].on('close', () => {
      logger(`Recording finished for ${username}, saved as ${filePath}`, 'info');
      activeUsers.delete(userId);
      resetInactivityTimer(); // Resets inactivity timer when recording finishes
    });

    activeUsers.add(userId);
  } catch (error) {
    logger(`Failed to start recording for user ${username}: ${error}`, 'error');
  }
}

// Stops recording for a specified user or all users, handling the cleanup of FFmpeg processes
export async function stopRecording(userId = null) {
  return new Promise((resolve) => {
    if (userId) {
      if (!ffmpegProcesses[userId]) {
        logger(`No active recording found for userId: ${userId}`, 'info');
        resolve(null);
        return;
      }

      // Ends the recording process for a specific user after a brief delay
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
      // Stops recording for all active users
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

// Listens for voice state updates and manages recordings based on user activity
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

// Logs into Discord with the bot token
client.login(process.env.BOT_TOKEN);

// Toggles scrying session state and inactivity timer
export function setScryingSessionActive(isActive, channelId = null) {
  isScryingSessionActive = isActive;
  scryingChannelId = channelId; // Stores channel ID for notifications
  isActive ? resetInactivityTimer() : clearInactivityTimer();
}

// Checks if the scrying session is currently active
export function isScryingSessionOngoing() {
  return isScryingSessionActive;
}