import { spawn } from 'child_process';
import fs from 'fs';
import prism from 'prism-media';

let ffmpegProcess = null;
let audioStream = null;

export function startRecording(connection, userId) {
  const opusDecoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  audioStream = connection.receiver.subscribe(userId, { end: 'manual', mode: 'opus' });
  const pcmStream = audioStream.pipe(opusDecoder);

  ffmpegProcess = spawn('ffmpeg', [
    '-f', 's16le', '-ar', '48000', '-ac', '2', '-i', 'pipe:0', '-f', 'wav', 'pipe:1'
  ]);

  pcmStream.pipe(ffmpegProcess.stdin);
  const output = fs.createWriteStream('test_audio.wav');
  ffmpegProcess.stdout.pipe(output);

  ffmpegProcess.on('close', () => console.log('Recording finished and saved as test_audio.wav'));
  ffmpegProcess.on('error', (error) => console.error('FFmpeg error:', error));
}

export function stopRecording() {
  return new Promise((resolve) => {
    if (!ffmpegProcess || !audioStream) {
      resolve(false);
      return;
    }

    audioStream.destroy();
    ffmpegProcess.stdin.end();

    ffmpegProcess.on('close', () => {
      ffmpegProcess = null;
      audioStream = null;
      console.log('Stopped recording.');
      resolve(true);
    });
  });
}
