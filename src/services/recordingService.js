import fs from 'fs';
import path from 'path';
import { PermissionsBitField } from 'discord.js';
import {
  joinVoiceChannel,
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus,
} from '@discordjs/voice';

import { generateTimestamp, sanitizeName } from '../utils/common.js';
import config from '../config/config.js';
import { startRecording, stopRecording } from './voiceRecordingService.js';
import { transcribeSession } from './transcriptionService.js';
import { summarizeTranscript } from './summaryService.js';

const sessions = new Map();

// join or move
export async function joinChannel(voiceChannel, textChannel) {
  const guildId = voiceChannel.guild.id;
  const perms = voiceChannel.permissionsFor(voiceChannel.client.user);
  if (!perms.has(PermissionsBitField.Flags.Connect) ||
      !perms.has(PermissionsBitField.Flags.Speak)) {
    throw new Error('Missing Connect/Speak permissions');
  }
  const existing = getVoiceConnection(guildId);
  if (existing) existing.destroy();
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
  });
  await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

  sessions.set(guildId, {
    connection,
    textChannelId: textChannel.id,
    sessionName: null,
    active: false,
  });
  return connection;
}

export function leaveChannel(guildId) {
  const s = sessions.get(guildId);
  if (s?.connection) s.connection.destroy();
  sessions.delete(guildId);
}

export async function beginSession(rawName, voiceChannel, textChannel) {
  const guildId = voiceChannel.guild.id;
  const s = sessions.get(guildId);
  if (!s?.connection) throw new Error('Use /gaze first to connect me.');
  if (s.active) throw new Error('Session already active.');

  const name = sanitizeName(rawName).slice(0, config.sessionNameMaxLength);
  const recDir = path.join(config.recordingsDir, name);
  const txtDir = path.join(config.transcriptsDir, name);
  if (fs.existsSync(recDir) || fs.existsSync(txtDir)) {
    throw new Error(`Session "${name}" exists already.`);
  }
  fs.mkdirSync(recDir, { recursive: true });
  fs.mkdirSync(txtDir, { recursive: true });

  s.sessionName = name;
  s.active = true;

  const ts = generateTimestamp();
  for (const [id, member] of voiceChannel.members) {
    if (member.user.bot) continue;
    const safeName = sanitizeName(member.user.username);
    await startRecording(s.connection, id, path.join(recDir, `audio_${safeName}_${id}_${ts}.wav`));
  }
  await textChannel.send(`🔮 Recording begun for session **${name}**.`);
}

export async function endSession(guildId) {
  const s = sessions.get(guildId);
  if (!s?.active) throw new Error('No active session to end.');
  await stopRecording(guildId);
  s.active = false;

  // transcription & summary
  const transcriptText = await transcribeSession(s.sessionName);
  const summaryText    = await summarizeTranscript(s.sessionName);

  const clientTextCh = s.connection.joinConfig.guildId; // fetch via client.channels.cache in commands
  // send in commands–see below
  return { transcriptText, summaryText };
}

export function isSessionActive(guildId) {
  return sessions.get(guildId)?.active === true;
}

export function getSessionName(guildId) {
  return sessions.get(guildId)?.sessionName || null;
}