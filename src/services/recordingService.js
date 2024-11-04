import { spawn, exec } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import config from '../config/config.js';
import { verboseLog, logger } from '../utils/logger.js';
import { resetInactivityTimer, clearInactivityTimer } from '../utils/timers.js';
import { getDirName, generateTimestamp, getClient } from '../utils/common.js';
import { stopRecordingAndTranscribe } from '../commands/endScrying.js';

const recordingsDir = path.join(getDirName(), '../../bin/recordings');

let connection = null;
let ffmpegProcesses = {}; // Stores FFmpeg processes for each user
let activeUsers = new Set(); // Tracks users actively being recorded
let recordingStopping = false; // Add flag to signal recording closure
let silenceWriterInterval = null; // Interval for writing silence
let silenceCheckInterval = null;
let scryingChannelId = null;
let currentSessionName = null;
let isScryingSessionActive = false;

// Sets the inactivity limit in milliseconds based on configuration
const INACTIVITY_LIMIT = config.inactivityTimeoutMinutes * 60 * 1000;

export function resetSessionState() {
  currentSessionName = null;
  scryingChannelId = null;
  isScryingSessionActive = false;
  recordingStopping = false;
  clearInactivityTimer(); // Ensure the timer is fully cleared
  verboseLog('Session state reset for a fresh start.', 'info');
}

// Sets the active voice connection
export function setConnection(conn) {
  connection = conn;
  logger('Connection established and stored in recordingService', 'info');

  // Log specific properties to avoid circular references
  verboseLog(`Connection details: {
    guildId: ${conn?.joinConfig?.guildId},
    channelId: ${conn?.joinConfig?.channelId},
    receiverStatus: ${conn?.receiver ? "active" : "inactive"}
  }`);

  //resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT); // Resets the timer when a connection is established
}

// Retrieves the active connection for a given guild
export function getActiveConnection(guildId) {
  verboseLog(`Getting active connection for guildId: ${guildId}`);
  return connection?.joinConfig.guildId === guildId ? connection : null;
}

// Clears the active connection when leaving the channel
export function clearConnection() {
  connection = null;
  logger('Connection cleared.', 'info');
  clearInactivityTimer(); // Stops the timer when connection is cleared
}

async function endScryingSession() {
  if (isScryingSessionActive) {
    verboseLog('Ending scrying session due to inactivity timer.');
    const client = getClient();
    const channel = client.channels.cache.get(scryingChannelId);

    if (!channel) {
      logger(`Channel with ID ${scryingChannelId} not found. Unable to send inactivity notification.`, 'error');
      return;
    }

    await channel.send(`The scrying session has ended due to ${config.inactivityTimeoutMinutes} minutes of inactivity.`);
    await stopRecordingAndTranscribe(null, channel);

    logger('Scrying session ended due to inactivity.', 'info');
    setScryingSessionActive(false);
    clearSilenceCheckInterval(); // Ensure silenceCheckInterval is cleared
  } else {
    verboseLog('Attempted to end scrying session, but no active session found.');
  }
}

// Helper function to clear the silence check interval
function clearSilenceCheckInterval() {
  if (silenceCheckInterval) {
    clearInterval(silenceCheckInterval);
    silenceCheckInterval = null;
    verboseLog('Silence check interval cleared.');
  } else {
    verboseLog('No silence check interval to clear.');
  }
}

// Helper to retrieve the active scrying channel ID
export function getScryingChannelId() {
  verboseLog(`Getting active scrying channel ID: ${scryingChannelId}`);
  return scryingChannelId;
}

// Sets the session name for the current recording
export function setSessionName(sessionName) {
  currentSessionName = sessionName;
  verboseLog(`Session name set to: ${currentSessionName}`);
}

// Retrieves the current session name
export function getSessionName() {
  verboseLog(`Retrieving current session name: ${currentSessionName}`);
  return currentSessionName;
}

// Toggles scrying session state and inactivity timer
export function setScryingSessionActive(isActive, channelId = null) {
  isScryingSessionActive = isActive;
  scryingChannelId = channelId;

  verboseLog(`Scrying session details: isActive=${isActive}, channelId=${channelId}`);

  if (isActive) {
    verboseLog('Activating scrying session and setting inactivity timer.');
    resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT);
  } else {
    verboseLog('Deactivating scrying session and clearing inactivity timer.');
    clearInactivityTimer();
  }
}

// Checks if the scrying session is currently active
export function isScryingSessionOngoing() {
  verboseLog(`Checking if scrying session is ongoing: ${isScryingSessionActive}`);
  return isScryingSessionActive;
}

export async function startRecording(conn, userId, username) {
  if (recordingStopping || !conn || !conn.receiver) {
    logger("Recording is stopping or connection is not established. Cannot start recording.", 'error');
    return;
  }

  await stopRecording(userId);

  if (!currentSessionName) {
    logger("No active session found. Cannot start recording.", 'error');
    return;
  }

  const sessionDir = path.join(recordingsDir, currentSessionName);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const timestamp = generateTimestamp();
  const filePath = path.join(sessionDir, `audio_${username}_${userId}_${timestamp}.wav`);

  const audioSettings = {
    rate: config.audioQuality === 'high' ? '48000' : config.audioQuality === 'medium' ? '24000' : '16000',
    channels: config.audioQuality === 'high' ? '2' : '1',
    codec: 'pcm_s16le'
  };

  const opusDecoder = new prism.opus.Decoder({
    frameSize: 960,
    channels: parseInt(audioSettings.channels),
    rate: parseInt(audioSettings.rate)
  });

  const startTime = process.hrtime.bigint();

  const debugInterval = setInterval(() => {
    const elapsedTime = (process.hrtime.bigint() - startTime) / 1000000n;
    const realElapsedSeconds = Number(elapsedTime) / 1000;
    verboseLog(`Debug: Real elapsed time: ${realElapsedSeconds.toFixed(2)} seconds, Expected WAV file length: ~${realElapsedSeconds.toFixed(2)} seconds`);
  }, 5000);

  try {
    const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    // Start FFmpeg with wallclock, -re, and aresample to handle silence automatically
    ffmpegProcesses[userId] = spawn('ffmpeg', [
      "-hide_banner",
      "-y",
      "-re", // Real-time input processing
      "-use_wallclock_as_timestamps", "1",
      "-f", "s16le",
      "-ar", audioSettings.rate,
      "-ac", audioSettings.channels,
      "-i", "pipe:0",
      "-af", "aresample=async=1:first_pts=0:min_comp=0.001:min_hard_comp=0.100",
      "-ac", audioSettings.channels,
      filePath
    ]);

    pcmStream.pipe(ffmpegProcesses[userId].stdin);

    // Initial silence buffer to initiate recording
    const initialSilenceBuffer = Buffer.alloc(audioSettings.rate * audioSettings.channels / 100, 0); // ~10ms silence
    ffmpegProcesses[userId].stdin.write(initialSilenceBuffer);
    verboseLog('Initial silence buffer written to initiate recording.');

    // Check if the file exists every 50ms and stop silence insertion if detected
    const fileCheckInterval = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(fileCheckInterval);
        verboseLog("WAV file detected. Stopping additional silence buffer insertion.");
      } else {
        ffmpegProcesses[userId].stdin.write(initialSilenceBuffer); // Keep writing initial silence if file doesn’t exist
      }
    }, 50);

    let isAudioActive = false; // Track if audio is currently active
    let silenceTailTimer = null; // Store the silence tail timer

    pcmStream.on('data', (chunk) => {
      const volume = Math.sqrt(chunk.reduce((sum, val) => sum + val * val, 0) / chunk.length);
      const VOLUME_THRESHOLD = 75; // Adjust to capture more audio without triggering on background noise
      const SILENCE_TAIL_DURATION = 1000; // 1000 ms buffer after last audio for smoother transitions

      if (volume > VOLUME_THRESHOLD) {
        // If audio resumes and was previously inactive, log and clear the silence timer
        if (!isAudioActive) {
          isAudioActive = true;
          verboseLog(`Audio detected with volume: ${volume}`);
        }

        // Clear the silence tail timer if audio is active again
        if (silenceTailTimer) {
          clearTimeout(silenceTailTimer);
          silenceTailTimer = null;
        }
      } else if (isAudioActive && !silenceTailTimer) {
        // Start the silence tail timer when audio goes below threshold and no timer is set
        silenceTailTimer = setTimeout(() => {
          isAudioActive = false; // Mark audio as inactive after buffer period
          silenceTailTimer = null; // Reset timer reference
          verboseLog('Silence tail timer expired; treating as end of audio.');
        }, SILENCE_TAIL_DURATION);
      }
    });

    pcmStream.on('end', () => {
      // Clear any remaining silence tail timer on stream end
      if (silenceTailTimer) {
        clearTimeout(silenceTailTimer);
      }
      clearInterval(debugInterval);
      clearInactivityTimer();
      pcmStream.removeAllListeners('data');
    });

    ffmpegProcesses[userId].on('error', (error) => {
      logger(`FFmpeg error for user ${username}: ${error.message}`, 'error');
      activeUsers.delete(userId);
      clearInterval(fileCheckInterval);
      clearInterval(debugInterval);
    });

    ffmpegProcesses[userId].on('close', () => {
      logger(`Recording finished for ${username}, saved as ${filePath}`, 'info');
      activeUsers.delete(userId);
      clearInterval(fileCheckInterval);
      clearInterval(debugInterval);

      exec(`ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`, (err, stdout) => {
        if (err) {
          verboseLog(`Error retrieving WAV file duration: ${err.message}`);
          return;
        }
        const wavDuration = parseFloat(stdout.trim());
        const finalElapsedTime = Number(process.hrtime.bigint() - startTime) / 1000000000;
        verboseLog(`Debug Complete: Real elapsed time: ${finalElapsedTime.toFixed(2)} seconds, Actual WAV file length: ${wavDuration.toFixed(2)} seconds`);
      });
    });

    activeUsers.add(userId);
  } catch (error) {
    logger(`Failed to start recording for user ${username}: ${error}`, 'error');
  }
}

// In stopRecording, reset recordingStopping to false after all recordings end
export async function stopRecording(userId = null) {
  recordingStopping = true;

  return new Promise((resolve) => {
    const stopPromises = userId
      ? [stopUserRecording(userId)]
      : Object.keys(ffmpegProcesses).map((activeUserId) => stopUserRecording(activeUserId));

    Promise.all(stopPromises)
      .then((results) => {
        recordingStopping = false;
        clearInactivityTimer();
        resolve(results);
      })
      .finally(() => {
        clearInactivityTimer();
        recordingStopping = false;
        verboseLog("Cleanup complete after stopping recordings.");
      });
  });
}

// This helper function stops a single user's recording and returns a promise
function stopUserRecording(userId) {
  return new Promise((resolve) => {
    if (ffmpegProcesses[userId]) {
      ffmpegProcesses[userId].stdin.end(); // End input to FFmpeg
      ffmpegProcesses[userId].on('close', () => { // Wait until FFmpeg process closes
        logger(`Stopped recording for userId: ${userId}`, 'info');
        delete ffmpegProcesses[userId]; // Clean up process reference
        activeUsers.delete(userId); // Remove user from active users
        resolve({ userId }); // Resolve the promise once stopped
      });
    } else {
      resolve(null); // If no process exists, resolve immediately
    }
  });
}
