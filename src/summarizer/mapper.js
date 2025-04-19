import Bottleneck from 'bottleneck';
import OpenAI from 'openai';
import config from '../config/config.js';

// Initialize OpenAI client (expects OPENAI_API_KEY in env)
const openai = new OpenAI();

// Rate limiter for map-phase calls
const limiter = new Bottleneck({
  minTime: 1000 / config.summarizer.rateLimit.requestsPerSecond,
  maxConcurrent: config.summarizer.rateLimit.maxConcurrent,
});

// Wrap the chat completion method
const safeCreateCompletion = limiter.wrap((options) =>
  openai.chat.completions.create(options)
);

/**
 * Summarizes a transcript chunk into 3–5 bullet points with speaker annotations.
 *
 * @param {string} textChunk
 * @returns {Promise<string>} The bullet-point summary.
 */
export async function mapSummary(textChunk) {
  const messages = [
    { role: 'system', content: 'You are a concise meeting summarizer. Provide 3–5 bullet points, prefixing each with the speaker’s name:' },
    { role: 'user', content: textChunk }
  ];

  const response = await safeCreateCompletion({
    model: config.openAIModel || 'gpt-3.5-turbo',
    messages,
    // Optional: add max_tokens if you want to cap summary length
    temperature: 0.5,
  });

  // Extract and return the generated content
  return response.choices?.[0]?.message?.content.trim() || '';
}
