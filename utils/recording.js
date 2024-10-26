import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';

let ffmpegProcesses = {};
let audioStreams = {};

export function startRecording(connection, userId, username) {
  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const userStream = connection.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
  const pcmStream = userStream.pipe(opusDecoder);

  ffmpegProcesses[userId] = spawn('ffmpeg', [
    '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', '-f', 'wav', `pipe:1`
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

    ffmpegProcesses[userId].stdin.end();
    ffmpegProcesses[userId].on('close', () => {
      const filePath = `audio_${userId}.wav`;
      fs.writeFileSync(filePath, completeAudioBuffer);
      ffmpegProcesses[userId] = null;
      audioStreams[userId] = null;
      console.log(`Stopped recording for userId: ${userId}`);
      resolve({ filePath, userId });
    });
  });
}
