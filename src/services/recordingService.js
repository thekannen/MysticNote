import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import config from '../config/config.js';
import { getDirName } from '../utils/common.js';
import { logger } from '../utils/logger.js';
import { stopRecordingAndTranscribe } from '../commands/endScrying.js';

// Directories for storing recordings and tracking state
const recordingsDir = path.join(getDirName(), '../../bin/recordings');
let connection = null;
let ffmpegProcesses = {};
let activeUsers = new Set();
let scryingChannelId = null;
let currentSessionName = null;
let isScryingSessionActive = false;
let inactivityTimeout = null;

const INACTIVITY_LIMIT = config.inactivityTimeoutMinutes * 60 * 1000;

// Sets the active voice connection
export function setConnection(conn) {
  connection = conn;
  logger('Connection established in recordingService.js', 'info');
  resetInactivityTimer();
}

// Retrieves the active connection for a given guild
export function getActiveConnection(guildId) {
  return connection?.joinConfig.guildId === guildId ? connection : null;
}

// Clears the active connection when leaving the channel
export function clearConnection() {
  connection = null;
  logger('Connection cleared.', 'info');
  clearInactivityTimer();
}

// Resets the inactivity timer
function resetInactivityTimer() {
  clearInactivityTimer();
  inactivityTimeout = setTimeout(() => {
    logger(`No audio detected for ${config.inactivityTimeoutMinutes} minutes. Ending session due to inactivity.`, 'info');
    endScryingSession(client); // Ends session if no activity
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
export async function endScryingSession(client) {
  if (isScryingSessionActive) {
    const channel = client.channels.cache.get(getScryingChannelId());

    if (!channel) {
      logger(`Channel with ID ${scryingChannelId} not found.`, 'error');
      return;
    }

    await channel.send(`The session has ended due to ${config.inactivityTimeoutMinutes} minutes of inactivity.`);
    await stopRecordingAndTranscribe(null, channel);
    logger('Session ended due to inactivity.', 'info');
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

// Starts recording for a user
export async function startRecording(client, userId, username) {
  if (!connection || !connection.receiver) {
    logger("Connection not established. Cannot start recording.", 'error');
    return;
  }

  await stopRecording(userId); // Stops existing recording if any

  const sessionDir = path.join(recordingsDir, currentSessionName);

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(sessionDir, `audio_${username}_${userId}_${timestamp}.wav`);

  try {
    const userStream = connection.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    ffmpegProcesses[userId] = spawn('ffmpeg', ['-y', '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', filePath]);
    pcmStream.pipe(ffmpegProcesses[userId].stdin);
    pcmStream.on('data', () => resetInactivityTimer());
    ffmpegProcesses[userId].on('close', () => {
      logger(`Recording finished for ${username}`, 'info');
      activeUsers.delete(userId);
      resetInactivityTimer();
    });

    activeUsers.add(userId);
  } catch (error) {
    logger(`Failed to start recording for user ${username}: ${error}`, 'error');
  }
}

// Stops recording for a user or all users
export async function stopRecording(userId = null) {
  return new Promise((resolve) => {
    if (userId && ffmpegProcesses[userId]) {
      ffmpegProcesses[userId].stdin.end();
      ffmpegProcesses[userId].on('close', () => {
        delete ffmpegProcesses[userId];
        activeUsers.delete(userId);
        resetInactivityTimer();
        resolve();
      });
    } else {
      Object.keys(ffmpegProcesses).forEach((id) => ffmpegProcesses[id].stdin.end());
      resolve();
    }
  });
}