import fs from 'fs';
import prism from 'prism-media';

const recordStreams = new Map(); // guildId -> [opusStream, writeStreams...]

export async function startRecording(connection, userId, filePath) {
  const receiver = connection.receiver;
  const opusStream = receiver.subscribe(userId, { end: { behavior: 'manual' } });
  const wav = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
  const out = fs.createWriteStream(filePath);
  opusStream.pipe(wav).pipe(out);

  if (!recordStreams.has(connection.joinConfig.guildId)) {
    recordStreams.set(connection.joinConfig.guildId, []);
  }
  recordStreams.get(connection.joinConfig.guildId).push({ opusStream, out });
}

// stops all streams for this guild
export async function stopRecording(guildId) {
  const streams = recordStreams.get(guildId) || [];
  for (const { opusStream, out } of streams) {
    opusStream.emit('end', 'manual');
    out.end();
  }
  recordStreams.delete(guildId);
}