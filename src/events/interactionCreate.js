import commands from './index.js';
import { logger } from '../utils/logger.js';

/**
 * Event handler for 'interactionCreate' event.
 * @param {import('discord.js').Interaction} interaction - The interaction object.
 */
export async function handleInteractionCreate(interaction) {
  if (!interaction.isCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({ content: 'Unknown command.', ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger(`Error executing command "${interaction.commandName}": ${error.message}`, 'error');
    logger(`Stack trace: ${error.stack}`, 'error');

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'An error occurred while executing that command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'An error occurred while executing that command.', ephemeral: true });
    }
  }
}
