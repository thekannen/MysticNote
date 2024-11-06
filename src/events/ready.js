import { logger } from '../utils/logger.js';

/**
 * Event handler for the 'ready' event.
 * @param {import('discord.js').Client} client - The Discord client instance.
 */
export function handleReady() {
  logger(`Logged in as ${this.user.tag}`, 'verbose');
}
