'use strict';

import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import config from '../config/config.js';
import { logger } from '../utils/logger.js';
import { getDirName, generateTimestamp } from '../utils/common.js';

const recordingsDir = path.join(getDirName(), '../../bin/recordings');

let connection = null;
let userRecordings = {}; // Stores recording data for each user
let scryingChannelId = null;
let currentSessionName = null;
let isScryingSessionActive = false;

/**
 * Sets the active voice connection
 */
export function setConnection(conn) {
  connection = conn;
  logger('Connection established and stored in recordingService', 'info');

  // Log specific properties to avoid circular references
  logger(`Connection details: {
    guildId: ${conn?.joinConfig?.guildId},
    channelId: ${conn?.joinConfig?.channelId},
    receiverStatus: ${conn?.receiver ? 'active' : 'inactive'}
  }`, 'verbose');
}

/**
 * Retrieves the active connection for a given guild
 */
export function getActiveConnection(guildId) {
  logger(`Getting active connection for guildId: ${guildId}`, 'debug');
  return connection?.joinConfig.guildId === guildId ? connection : null;
}

/**
 * Clears the active connection when leaving the channel
 */
export function clearConnection() {
  connection = null;
  logger('Connection cleared.', 'info');
}

/**
 * Helper to retrieve the active scrying channel ID
 */
export function getScryingChannelId() {
  logger(`Getting active scrying channel ID: ${scryingChannelId}`, 'debug');
  return scryingChannelId;
}

/**
 * Sets the session name for the current recording
 */
export function setSessionName(sessionName) {
  currentSessionName = sessionName;
  logger(`Session name set to: ${currentSessionName}`, 'verbose');
}

/**
 * Retrieves the current session name
 */
export function getSessionName() {
  logger(`Retrieving current session name: ${currentSessionName}`, 'verbose');
  return currentSessionName;
}

/**
 * Toggles scrying session state
 */
export function setScryingSessionActive(isActive, channelId = null) {
  isScryingSessionActive = isActive;
  scryingChannelId = channelId;

  logger(`Scrying session details: isActive=${isActive}, channelId=${channelId}`, 'debug');

  if (isActive) {
    logger('Activating scrying session.', 'debug');
  } else {
    logger('Deactivating scrying session.', 'debug');
  }
}

/**
 * Checks if the scrying session is currently active
 */
export function isScryingSessionOngoing() {
  logger(`Checking if scrying session is ongoing: ${isScryingSessionActive}`, 'debug');
  return isScryingSessionActive;
}

/**
 * Starts recording for a user
 */
export async function startRecording(conn, userId, username) {
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

  try {
    const userStream = conn.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
    const pcmStream = userStream.pipe(opusDecoder);

    const ffmpegProcess = spawn('ffmpeg', [
      '-hide_banner',
      //'-loglevel', 'verbose', // Increased log level
      '-thread_queue_size', '512', // Increase queue size
      '-y', // Overwrite output if exists
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
      '-use_wallclock_as_timestamps',
      '1', // Synchronize timestamps with wall clock
      filePath, // Output file path
    ]);

    // Handle FFmpeg stderr output
    ffmpegProcess.stderr.on('data', (data) => {
      logger(`FFmpeg stderr for user ${username}: ${data.toString()}`, 'warn');
    });

    // Handle FFmpeg stdin errors
    ffmpegProcess.stdin.on('error', (err) => {
      if (err.code === 'EPIPE') {
        logger(`FFmpeg stdin EPIPE error for user ${username}: ${err.message}`, 'error');
      } else {
        logger(`FFmpeg stdin error for user ${username}: ${err.message}`, 'error');
      }
    });

    // Write the initial silence buffer to initiate recording
    const initialSilenceBuffer = Buffer.alloc(
      parseInt(audioSettings.rate) * parseInt(audioSettings.channels),
      0
    );
    ffmpegProcess.stdin.write(initialSilenceBuffer);
    logger('Initial silence buffer written to initiate recording.', 'debug');

    pcmStream.pipe(ffmpegProcess.stdin);

    const recordingStartTime = Date.now(); // Wall clock time when recording starts

    // Store recording data for cleanup later
    userRecordings[userId] = {
      ffmpegProcess: ffmpegProcess,
      userStream: userStream,
      pcmStream: pcmStream,
      hasCloseHandler: false,
      startTime: startTime,
      filePath: filePath,
      username: username,
      timestamps: [],
      recordingStartTime: recordingStartTime,
      bytesReceived: 0,
    };

    const recordingData = userRecordings[userId]; // For easier access
    recordingData.bytesReceived = 0; // Initialize bytesReceived

    const FLUSH_INTERVAL = 5 * 60 * 1000; // Every 5 minutes

    // Start the flush timer to periodically save timestamps to disk
    recordingData.flushTimer = setInterval(() => {
      flushTimestampsToDisk(recordingData);
    }, FLUSH_INTERVAL);

    // Ensure 'close' event handler is only attached once
    if (!recordingData.hasCloseHandler) {
      recordingData.hasCloseHandler = true;

      ffmpegProcess.on('close', (code, signal) => {
        logger(
          `FFmpeg process exited for user ${username} with code ${code} and signal ${signal}`,
          'debug'
        );

        // Unpipe and destroy streams
        recordingData.pcmStream.unpipe();
        recordingData.pcmStream.destroy();
        recordingData.userStream.destroy();

        // Flush any remaining timestamps to disk
        flushTimestampsToDisk(recordingData, true);

        // Clear the flush timer
        if (recordingData.flushTimer) {
          clearInterval(recordingData.flushTimer);
          recordingData.flushTimer = null;
        }

        delete userRecordings[userId];
        logger(`Recording finished for ${username}, saved as ${filePath}`, 'verbose');
      });

      ffmpegProcess.on('error', (error) => {
        logger(`FFmpeg error for user ${username}: ${error.message}`, 'error');
      });
    }

    // Monitor audio data to collect timestamps
    pcmStream.on('data', (chunk) => {
      const currentTime = Date.now(); // Current system time in milliseconds
      recordingData.bytesReceived += chunk.length; // Increment bytes received

      // Record the timestamp and position
      recordingData.timestamps.push({
        time: currentTime, // System time
        position: recordingData.bytesReceived, // Cumulative bytes received
      });

      // Limit the size of timestamps array to prevent memory leak
      if (recordingData.timestamps.length >= 1000) {
        flushTimestampsToDisk(recordingData);
      }
    });

    // Handle errors on pcmStream
    pcmStream.on('error', (error) => {
      logger(`PCM stream error for user ${username}: ${error.message}`, 'error');
    });

    // Monitor stream end events
    pcmStream.on('end', () => {
      logger(`PCM stream ended for user ${username}`, 'debug');
      pcmStream.removeAllListeners(); // Remove all listeners
    });

    pcmStream.on('close', () => {
      logger(`PCM stream closed for user ${username}`, 'debug');
      pcmStream.removeAllListeners(); // Remove all listeners
    });

    userStream.on('end', () => {
      logger(`User stream ended for user ${username}`, 'debug');
      userStream.removeAllListeners(); // Remove all listeners
    });

    userStream.on('close', () => {
      logger(`User stream closed for user ${username}`, 'debug');
      userStream.removeAllListeners(); // Remove all listeners
    });

    userStream.on('error', (error) => {
      logger(`User stream error for user ${username}: ${error.message}`, 'error');
    });

    logger(`Started recording for user ${username} (ID: ${userId})`, 'info');
    logger(`Started recording for user ${username} (ID: ${userId})`, 'verbose');
  } catch (error) {
    logger(`Failed to start recording for user ${username}: ${error}`, 'error');
  }
}

/**
 * Flushes the timestamps to disk and clears the in-memory array
 * @param {Object} recordingData - The recording data object for the user
 * @param {boolean} isFinalFlush - Whether this is the final flush before ending recording
 */
function flushTimestampsToDisk(recordingData, isFinalFlush = false) {
  if (recordingData.timestamps.length === 0) {
    return;
  }

  const timestampData = {
    timestamps: recordingData.timestamps,
    recordingStartTime: recordingData.recordingStartTime,
    isFinalFlush: isFinalFlush,
  };
  const timestampFilePath = recordingData.filePath.replace('.wav', '_timestamps.json');

  try {
    fs.appendFileSync(timestampFilePath, JSON.stringify(timestampData) + '\n', 'utf8');
    logger(
      `Flushed ${recordingData.timestamps.length} timestamps to disk for user ${recordingData.username}.`,
      'debug'
    );
    recordingData.timestamps = []; // Clear the array after flushing
  } catch (error) {
    logger(
      `Error writing timestamps to disk for user ${recordingData.username}: ${error.message}`,
      'error'
    );
  }
}

/**
 * Stops recording for a specified user or all users, handling the cleanup of FFmpeg processes
 */
export async function stopRecording(userId = null) {
  return new Promise((resolve) => {
    if (userId) {
      const recordingData = userRecordings[userId];
      if (!recordingData) {
        logger(`No active recording found for userId: ${userId}`, 'debug');
        resolve(null);
        return;
      }

      // Flag to check if process exited
      let processExited = false;

      const onProcessClose = () => {
        if (!processExited) {
          processExited = true;

          // Flush any remaining timestamps to disk
          flushTimestampsToDisk(recordingData, true);

          // Clear the flush timer
          if (recordingData.flushTimer) {
            clearInterval(recordingData.flushTimer);
            recordingData.flushTimer = null;
          }

          delete userRecordings[userId];
          logger(
            `Stopped recording for userId: ${userId}, saved as ${recordingData.filePath}`,
            'debug'
          );
          resolve({
            filePath: recordingData.filePath,
            userId,
          });
        }
      };

      // Attach the close listener before ending streams
      recordingData.ffmpegProcess.once('close', onProcessClose);

      // Ensure all streams are properly destroyed
      try {
        recordingData.pcmStream.unpipe();
        recordingData.pcmStream.destroy();
        recordingData.userStream.destroy();

        // End FFmpeg stdin to signal completion
        recordingData.ffmpegProcess.stdin.end(() => {
          logger(`FFmpeg stdin ended for userId: ${userId}`, 'debug');
        });

        // In case FFmpeg doesn't exit, forcefully kill it after a timeout
        setTimeout(() => {
          if (!processExited) {
            logger(`Forcefully killing FFmpeg process for userId: ${userId}`, 'warn');
            recordingData.ffmpegProcess.kill('SIGTERM');
          }
        }, 5000); // Wait 5 seconds before force-killing
      } catch (err) {
        logger(`Error cleaning up resources for userId: ${userId} - ${err.message}`, 'error');
        // Ensure we still resolve the promise
        onProcessClose();
      }
    } else {
      // Stops recording for all active users
      const stopPromises = Object.keys(userRecordings).map(
        async (activeUserId) => {
          return new Promise((stopResolve) => {
            const recordingData = userRecordings[activeUserId];
            if (!recordingData) {
              logger(`No active recording found for userId: ${activeUserId}`, 'debug');
              stopResolve(null);
              return;
            }

            // Flag to check if process exited
            let processExited = false;

            const onProcessClose = () => {
              if (!processExited) {
                processExited = true;

                // Flush any remaining timestamps to disk
                flushTimestampsToDisk(recordingData, true);

                // Clear the flush timer
                if (recordingData.flushTimer) {
                  clearInterval(recordingData.flushTimer);
                  recordingData.flushTimer = null;
                }

                delete userRecordings[activeUserId];
                logger(
                  `Stopped recording for userId: ${activeUserId}, saved as ${recordingData.filePath}`,
                  'debug'
                );
                stopResolve({
                  filePath: recordingData.filePath,
                  userId: activeUserId,
                });
              }
            };

            // Attach the close listener before ending streams
            recordingData.ffmpegProcess.once('close', onProcessClose);

            // Ensure all streams are properly destroyed
            try {
              recordingData.pcmStream.unpipe();
              recordingData.pcmStream.destroy();
              recordingData.userStream.destroy();

              // End FFmpeg stdin to signal completion
              recordingData.ffmpegProcess.stdin.end(() => {
                logger(`FFmpeg stdin ended for userId: ${activeUserId}`, 'debug');
              });

              // In case FFmpeg doesn't exit, forcefully kill it after a timeout
              setTimeout(() => {
                if (!processExited) {
                  logger(`Forcefully killing FFmpeg process for userId: ${activeUserId}`, 'warn');
                  recordingData.ffmpegProcess.kill('SIGTERM');
                }
              }, 5000); // Wait 5 seconds before force-killing
            } catch (err) {
              logger(
                `Error cleaning up resources for userId: ${activeUserId} - ${err.message}`,
                'error'
              );
              // Ensure we still resolve the promise
              onProcessClose();
            }
          });
        }
      );

      Promise.all(stopPromises).then((results) => {
        logger('All active recordings have been stopped.', 'info');
        resolve(results);
      });
    }
  });
}
