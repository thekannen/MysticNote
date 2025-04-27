import OpenAI from 'openai';
const openai = new OpenAI();

export async function summarizeTranscript(sessionName) {
  // load transcript
  const full = fs.readFileSync(`bin/transcripts/${sessionName}/transcript.txt`, 'utf-8');
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful summarizer.' },
      { role: 'user', content: `Please summarize the following transcript:\n\n${full}` },
    ],
  });
  const summary = resp.choices[0].message.content;
  // save summary
  fs.writeFileSync(`bin/transcripts/${sessionName}/summary.txt`, summary);
  return summary;
}