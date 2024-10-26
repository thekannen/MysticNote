import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';
import path from 'path';
import { generateTimestamp } from '../utils.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let ffmpegProcesses = {};
let audioStreams = {};

export function startRecording(connection, userId, username) {
  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const userStream = connection.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
  const pcmStream = userStream.pipe(opusDecoder);

  ffmpegProcesses[userId] = spawn('ffmpeg', [
    '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', '-f', 'wav', 'pipe:1'
  ]);

  audioStreams[userId] = [];
  pcmStream.pipe(ffmpegProcesses[userId].stdin);

  ffmpegProcesses[userId].stdout.on('data', (chunk) => {
    audioStreams[userId].push(chunk);
  });

  ffmpegProcesses[userId].on('close', () => {
    console.log(`Recording finished for ${username}.`);
  });

  ffmpegProcesses[userId].on('error', (error) => console.error('FFmpeg error:', error));
}

export function stopRecording(userId) {
  return new Promise((resolve) => {
    if (!ffmpegProcesses[userId] || !audioStreams[userId]) {
      resolve(null);
      return;
    }

    const completeAudioBuffer = Buffer.concat(audioStreams[userId]);

    // Close the FFmpeg process
    ffmpegProcesses[userId].stdin.end();
    ffmpegProcesses[userId].on('close', () => {
      const timestamp = generateTimestamp().replace(/[:.]/g, '-');
      const recordingsDir = path.join(__dirname, '../recordings');
      if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir);

      const filePath = path.join(recordingsDir, `audio_${userId}_${timestamp}.wav`);
      fs.writeFileSync(filePath, completeAudioBuffer);

      delete ffmpegProcesses[userId];
      delete audioStreams[userId];
      
      console.log(`Stopped recording for userId: ${userId}, saved as ${filePath}`);
      resolve({ filePath, userId });
    });
  });
}
