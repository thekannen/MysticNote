'use strict';

import { spawn, exec } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import config from '../config/config.js';
import { verboseLog, logger } from '../utils/logger.js';
import { resetInactivityTimer, clearInactivityTimer } from '../utils/timers.js';
import { getDirName, generateTimestamp, getClient } from '../utils/common.js';
import { execute } from '../commands/endScrying.js';

const recordingsDir = path.join(getDirName(), '../../bin/recordings');

let connection = null;
let userRecordings = {}; // Stores recording data for each user
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

  // Log specific properties to avoid circular references
  verboseLog(`Connection details: {
    guildId: ${conn?.joinConfig?.guildId},
    channelId: ${conn?.joinConfig?.channelId},
    receiverStatus: ${conn?.receiver ? 'active' : 'inactive'}
  }`);
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
      logger(
        `Channel with ID ${scryingChannelId} not found. Unable to send inactivity notification.`,
        'error'
      );
      return;
    }

    await channel.send(
      `The scrying session has ended due to ${config.inactivityTimeoutMinutes} minutes of inactivity.`
    );
    await execute(null, channel);

    logger('Scrying session ended due to inactivity.', 'info');
  } else {
    verboseLog('Attempted to end scrying session, but no active session found.');
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
  // Declare variables at the function level
  let isAudioActive = false;
  let silenceTailTimer = null;

  // Check for and stop any existing recordings for this user
  await stopRecording(userId);

  if (!conn || !conn.receiver) {
    logger('Connection is not established. Cannot start recording.', 'error');
    return;
  }

  if (!currentSessionName) {
    logger('No active session found. Cannot start recording.', 'error');
    return;
  }

  const sessionDir = path.join(recordingsDir, currentSessionName);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const timestamp = generateTimestamp();
  const filePath = path.join(sessionDir, `audio_${username}_${userId}_${timestamp}.wav`);

  const audioSettings = {
    rate:
      config.audioQuality === 'high'
        ? '48000'
        : config.audioQuality === 'medium'
        ? '24000'
        : '16000',
    channels: config.audioQuality === 'high' ? '2' : '1',
    codec: 'pcm_s16le',
  };

  const opusDecoder = new prism.opus.Decoder({
    frameSize: 960,
    channels: parseInt(audioSettings.channels),
    rate: parseInt(audioSettings.rate),
  });

  const startTime = process.hrtime.bigint();

  const debugInterval = setInterval(() => {
    const elapsedTime = (process.hrtime.bigint() - startTime) / 1000000n;
    const realElapsedSeconds = Number(elapsedTime) / 1000;
    logger(
      `Debug: Real elapsed time: ${realElapsedSeconds.toFixed(
        2
      )} seconds, Expected WAV file length: ~${realElapsedSeconds.toFixed(2)} seconds`,
      'debug'
    );
  }, 5000);

  try {
    const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    const ffmpegProcess = spawn('ffmpeg', [
      '-hide_banner',
      '-y', // Overwrite output if exists
      '-use_wallclock_as_timestamps',
      'true', // Synchronize timestamps with wall clock
      '-f',
      's16le', // Set input format to raw PCM
      '-ar',
      audioSettings.rate, // Set audio sample rate
      '-ac',
      audioSettings.channels, // Set audio channels
      '-i',
      'pipe:0', // Read from standard input
      '-af',
      'aresample=async=1',
      filePath, // Output file path
    ]);

    let silenceBufferInserted = false; // Flag to control initial silence buffer

    // Write the initial silence buffer to initiate recording
    if (!silenceBufferInserted) {
      const initialSilenceBuffer = Buffer.alloc(
        parseInt(audioSettings.rate) * parseInt(audioSettings.channels),
        0
      );
      ffmpegProcess.stdin.write(initialSilenceBuffer);
      silenceBufferInserted = true; // Set the flag here
      verboseLog('Initial silence buffer written to initiate recording.');
    }

    // Reset inactivity timer when recording starts
    resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT);

    pcmStream.pipe(ffmpegProcess.stdin);

    // Store recording data for cleanup later
    userRecordings[userId] = {
      ffmpegProcess: ffmpegProcess,
      userStream: userStream,
      pcmStream: pcmStream,
      hasCloseHandler: false,
      debugInterval: debugInterval,
      startTime: startTime,
      filePath: filePath,
      username: username,
      isAudioActive: isAudioActive,
      silenceTailTimer: silenceTailTimer,
    };

    // Ensure 'close' event handler is only attached once
    if (!userRecordings[userId].hasCloseHandler) {
      userRecordings[userId].hasCloseHandler = true;

      ffmpegProcess.on('close', () => {
        logger(`Recording finished for ${username}, saved as ${filePath}`, 'info');
        activeUsers.delete(userId);
        clearInterval(debugInterval);

        exec(
          `ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`,
          (err, stdout) => {
            if (err) {
              verboseLog(`Error retrieving WAV file duration: ${err.message}`);
              return;
            }
            const wavDuration = parseFloat(stdout.trim());
            const finalElapsedTime =
              Number(process.hrtime.bigint() - startTime) / 1000000000;
            logger(
              `Debug Complete: Real elapsed time: ${finalElapsedTime.toFixed(
                2
              )} seconds, Actual WAV file length: ${wavDuration.toFixed(2)} seconds`,
              'debug'
            );
          }
        );
      });

      ffmpegProcess.on('error', (error) => {
        logger(`FFmpeg error for user ${username}: ${error.message}`, 'error');
        activeUsers.delete(userId);
        clearInterval(debugInterval);
      });

      ffmpegProcess.on('exit', (code, signal) => {
        logger(
          `FFmpeg process exited for user ${username} with code ${code} and signal ${signal}`,
          'info'
        );
      });
    }

    pcmStream.on('data', (chunk) => {
      // Calculate volume correctly using 16-bit signed integers
      const sampleCount = chunk.length / 2;
      let sum = 0;
      for (let i = 0; i < chunk.length; i += 2) {
        const val = chunk.readInt16LE(i); // Read 16-bit signed integer
        sum += val * val;
      }
      const volume = Math.sqrt(sum / sampleCount);
      const VOLUME_THRESHOLD = 2000; // Adjusted threshold after correcting calculation
      const SILENCE_TAIL_DURATION = 1000; // Time in ms before treating silence as end of audio

      if (volume > VOLUME_THRESHOLD) {
        if (!isAudioActive) {
          isAudioActive = true;
        }

        if (silenceTailTimer) {
          clearTimeout(silenceTailTimer);
          silenceTailTimer = null;
          logger('DEBUGGING: Silence tail timer cleared as audio resumed.', 'debug');
        }

         // **Reset the inactivity timer when audio is active**
        resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT);
        logger('Inactivity timer reset due to audio activity.', 'debug');
      } else if (isAudioActive && !silenceTailTimer) {
        logger('DEBUGGING: Volume below threshold, starting silence tail timer.', 'debug');

        silenceTailTimer = setTimeout(() => {
          isAudioActive = false; // Mark audio as inactive
          silenceTailTimer = null; // Clear the timer
          logger(
            'DEBUGGING: Silence tail timer expired; treating as end of audio. Setting isAudioActive to false.',
            'debug'
          );
        }, SILENCE_TAIL_DURATION);
      }

      logger(
        `DEBUGGING: End of chunk processing. isAudioActive=${isAudioActive}, silenceTailTimer=${!!silenceTailTimer}`,
        'debug'
      );
    });

    pcmStream.on('end', () => {
      logger('DEBUGGING: Ending PCM stream!', 'debug');
      // Clear any remaining silence tail timer on stream end
      if (silenceTailTimer) {
        clearTimeout(silenceTailTimer);
        silenceTailTimer = null;
      }
      clearInterval(debugInterval);
      pcmStream.removeAllListeners('data');
      // Consider whether to reset or leave the inactivity timer unchanged
    });

    activeUsers.add(userId);
    logger(`Started recording for user ${username} (ID: ${userId})`, 'info');
  } catch (error) {
    logger(`Failed to start recording for user ${username}: ${error}`, 'error');
  }
}

// Stops recording for a specified user or all users, handling the cleanup of FFmpeg processes
export async function stopRecording(userId = null) {
  return new Promise((resolve) => {
    if (userId) {
      if (!userRecordings[userId]) {
        logger(`No active recording found for userId: ${userId}`, 'info');
        resolve(null);
        return;
      }

      const recordingData = userRecordings[userId];
      if (recordingData && !recordingData.ffmpegProcess.killed) {
        try {
          // Clean up streams
          recordingData.pcmStream.unpipe();
          recordingData.pcmStream.destroy();
          recordingData.userStream.destroy();

          // End FFmpeg stdin to signal completion
          recordingData.ffmpegProcess.stdin.end();

          // Wait for FFmpeg process to exit
          recordingData.ffmpegProcess.once('close', () => {
            clearInterval(recordingData.debugInterval);
            delete userRecordings[userId];
            activeUsers.delete(userId);
            logger(
              `Stopped recording for userId: ${userId}, saved as ${recordingData.filePath}`,
              'info'
            );
            resolve({
              filePath: recordingData.filePath,
              userId,
            });
          });
        } catch (err) {
          logger(
            `Error cleaning up resources for userId: ${userId} - ${err.message}`,
            'error'
          );
          resolve(null);
        }
      } else {
        logger(
          `FFmpeg process for userId: ${userId} is no longer active.`,
          'info'
        );
        resolve(null);
      }
    } else {
      // Stops recording for all active users
      const stopPromises = Object.keys(userRecordings).map(
        async (activeUserId) => {
          return new Promise((stopResolve) => {
            const recordingData = userRecordings[activeUserId];
            if (recordingData && !recordingData.ffmpegProcess.killed) {
              try {
                // Clean up streams
                recordingData.pcmStream.unpipe();
                recordingData.pcmStream.destroy();
                recordingData.userStream.destroy();

                // End FFmpeg stdin to signal completion
                recordingData.ffmpegProcess.stdin.end();

                // Wait for FFmpeg process to exit
                recordingData.ffmpegProcess.once('close', () => {
                  clearInterval(recordingData.debugInterval);
                  delete userRecordings[activeUserId];
                  activeUsers.delete(activeUserId);
                  logger(
                    `Stopped recording for userId: ${activeUserId}, saved as ${recordingData.filePath}`,
                    'info'
                  );
                  stopResolve({
                    filePath: recordingData.filePath,
                    userId: activeUserId,
                  });
                });
              } catch (err) {
                logger(
                  `Error cleaning up resources for userId: ${activeUserId} - ${err.message}`,
                  'error'
                );
                stopResolve(null);
              }
            } else {
              logger(
                `FFmpeg process for userId: ${activeUserId} is no longer active.`,
                'info'
              );
              stopResolve(null);
            }
          });
        }
      );

      Promise.all(stopPromises).then((results) => {
        logger('All active recordings have been stopped.', 'info');
        // Reset inactivity timer instead of clearing it
        resetInactivityTimer(endScryingSession, INACTIVITY_LIMIT);
        resolve(results);
      });
    }
  });
}