import { verboseLog } from '../utils/logger.js';

/**
 * Event handler for the 'ready' event.
 * @param {import('discord.js').Client} client - The Discord client instance.
 */
export function handleReady() {
  verboseLog(`Logged in as ${this.user.tag}`);
}
