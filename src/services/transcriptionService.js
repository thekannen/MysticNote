import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
const openai = new OpenAI();

export async function transcribeSession(sessionName) {
  const dir = path.join(process.cwd(), 'bin', 'recordings', sessionName);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.wav'));
  files.sort(); // alphabetical → timestamp order

  let fullText = '';
  for (const file of files) {
    const resp = await openai.transcriptions.create({
      file: fs.createReadStream(path.join(dir, file)),
      model: 'whisper-1',
    });
    fullText += `\n[${file}]\n${resp.text}`;
  }
  // save to disk
  fs.writeFileSync(path.join(process.cwd(), 'bin', 'transcripts', sessionName, 'transcript.txt'), fullText);
  return fullText;
}