
import OpenAI from 'openai';
import config from '../config/config.js';

// Initialize OpenAI client (expects OPENAI_API_KEY in env)
const openai = new OpenAI();

/**
 * Consolidates an array of bullet-point summaries into one cohesive narrative.
 *
 * @param {string[]} partialSummaries - Array of bullet-list strings.
 * @returns {Promise<string>} The combined final summary.
 */
export async function reduceSummaries(partialSummaries) {
  const combinedBullets = partialSummaries.join('\n\n');
  const messages = [
    {
      role: 'system',
      content: 'You are a senior project manager writing the final meeting summary. Consolidate these bullets into a clear, cohesive narrative, grouping by topic and retaining speaker context:',
    },
    { role: 'user', content: combinedBullets }
  ];

  const response = await openai.chat.completions.create({
    model: config.openAIModel || 'gpt-3.5-turbo',
    messages,
    temperature: 0.5,
  });

  return response.choices?.[0]?.message?.content.trim() || '';
}