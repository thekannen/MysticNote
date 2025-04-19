
import { transcribeAndSaveSessionFolder } from './services/transcriptionService.js';
 
/**
 * Orchestrate the transcription and summary workflow for a session.
 *
 * @param {string} sessionName - Identifier for the audio session (folder name).
 * @returns {Promise<string>} - The generated meeting summary.
 */
export default async function handleSession(sessionName) {
  // Transcribe audio and generate summary
  const { summary } = await transcribeAndSaveSessionFolder(sessionName);
  return summary;
}