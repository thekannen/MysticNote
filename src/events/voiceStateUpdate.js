import { isScryingSessionOngoing, getActiveConnection, startRecording, stopRecording } from '../services/recordingService.js';
import { logger } from '../utils/logger.js';

/**
 * Event handler for 'voiceStateUpdate' event.
 * @param {import('discord.js').VoiceState} oldState - The previous voice state.
 * @param {import('discord.js').VoiceState} newState - The new voice state.
 */
export async function handleVoiceStateUpdate(oldState, newState) {
  try {
    // Ignore bot users
    if (newState.member.user.bot) return;

    const voiceChannel = newState.channel || oldState.channel;

    // Check if the bot is in the voice channel
    const client = newState.client;
    if (!voiceChannel || !voiceChannel.members.has(client.user.id)) {
      logger('Bot is not connected to the channel.', 'info');
      return;
    }

    const userId = newState.member.id;
    const username = newState.member.user.username;

    // Check if a scrying session is currently active
    if (isScryingSessionOngoing()) {
      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      const connection = getActiveConnection(newState.guild.id);
      if (!connection) {
        logger('No active connection found for the guild. Cannot start/stop recording.', 'error');
        return;
      }

      // User joins a voice channel
      if (!oldChannelId && newChannelId) {
        await startRecording(connection, userId, username);
        logger(`Started recording for user ${username} (ID: ${userId})`, 'info');
      }
      // User leaves the voice channel
      else if (oldChannelId && !newChannelId) {
        await stopRecording(userId);
        logger(`Stopped recording for user ${username} (ID: ${userId})`, 'info');
      }
      // User switches voice channels
      else if (oldChannelId !== newChannelId) {
        await stopRecording(userId);
        await startRecording(connection, userId, username);
        logger(`User ${username} (ID: ${userId}) switched channels. Restarted recording.`, 'info');
      }
    }
  } catch (error) {
    logger(`Error in voiceStateUpdate event: ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');
  }
}
