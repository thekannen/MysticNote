import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import config from '../config/config.js';
import { logger } from '../utils/logger.js';
import { resetInactivityTimer, clearInactivityTimer } from '../utils/timers.js';
import { getDirName, generateTimestamp } from '../utils/common.js';
import { stopRecordingAndTranscribe } from '../commands/endScrying.js';

const recordingsDir = path.join(getDirName(), '../../bin/recordings');

let connection = null;
let ffmpegProcesses = {}; // Stores FFmpeg processes for each user
let activeUsers = new Set(); // Tracks users actively being recorded
let scryingChannelId = null;
let currentSessionName = null;
let isScryingSessionActive = false;

// Sets the inactivity limit in milliseconds based on configuration
const INACTIVITY_LIMIT = config.inactivityTimeoutMinutes * 60 * 1000;

// Sets the active voice connection
export function setConnection(conn) {
  connection = conn;
  logger('Connection established and stored in recordingService', 'info');
  resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT); // Resets the timer when a connection is established
}

// Retrieves the active connection for a given guild
export function getActiveConnection(guildId) {
  return connection?.joinConfig.guildId === guildId ? connection : null;
}

// Clears the active connection when leaving the channel
export function clearConnection() {
  connection = null;
  logger('Connection cleared.', 'info');
  clearInactivityTimer(); // Stops the timer when connection is cleared
}

// Ends the scrying session if no audio is detected, sends a notification to the channel
async function endScryingSession() {
  if (isScryingSessionActive) {
    const channel = client.channels.cache.get(scryingChannelId);

    if (!channel) {
      logger(`Channel with ID ${scryingChannelId} not found. Unable to send inactivity notification.`, 'error');
      return;
    }

    await channel.send(`The scrying session has ended due to ${config.inactivityTimeoutMinutes} minutes of inactivity.`);
    await stopRecordingAndTranscribe(null, channel);

    logger('Scrying session ended due to inactivity.', 'info');
    setScryingSessionActive(false);
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

// Starts recording for a user with optimized audio settings
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

  const sessionDir = path.join(recordingsDir, currentSessionName);

  // Ensures the session directory exists
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const timestamp = generateTimestamp();
  const filePath = path.join(sessionDir, `audio_${username}_${userId}_${timestamp}.wav`);

  // Determine audio settings based on quality level
  let audioSettings;
  switch (config.audioQuality) {
    case 'high':
      audioSettings = {
        rate: '48000',    // High quality: 48 kHz
        channels: '2',    // Stereo
        codec: 'pcm_s16le' // 16-bit PCM for higher quality
      };
      break;
    case 'medium':
      audioSettings = {
        rate: '24000',    // Medium quality: 24 kHz
        channels: '1',    // Mono
        codec: 'pcm_s16le' // 16-bit PCM
      };
      break;
    case 'low':
    default:
      audioSettings = {
        rate: '16000',    // Low quality: 16 kHz
        channels: '1',    // Mono
        codec: 'pcm_u8'   // 8-bit PCM for smaller size
      };
      break;
  }

  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: parseInt(audioSettings.channels), rate: parseInt(audioSettings.rate) });

  try {
    const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    ffmpegProcesses[userId] = spawn('ffmpeg', [
      '-y',                      // Overwrite if file exists
      '-f', 's16le',             // PCM format
      '-ar', audioSettings.rate, // Sample rate
      '-ac', audioSettings.channels, // Channels
      '-i', 'pipe:0',            // Input from stdin
      '-c:a', audioSettings.codec, // Codec
      filePath                   // Output file path
    ]);

    pcmStream.pipe(ffmpegProcesses[userId].stdin);

    // Resets inactivity timer with each audio packet received
    pcmStream.on('data', () => resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT));

    ffmpegProcesses[userId].on('close', () => {
      logger(`Recording finished for ${username}, saved as ${filePath}`, 'info');
      activeUsers.delete(userId);
      resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT); // Reset inactivity timer when recording finishes
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
            resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT);
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

// Toggles scrying session state and inactivity timer
export function setScryingSessionActive(isActive, channelId = null) {
  isScryingSessionActive = isActive;
  scryingChannelId = channelId;
  isActive ? resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT) : clearInactivityTimer();
}

// Checks if the scrying session is currently active
export function isScryingSessionOngoing() {
  return isScryingSessionActive;
}