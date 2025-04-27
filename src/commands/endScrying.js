import { SlashCommandBuilder } from 'discord.js';
import { endSession, isSessionActive } from '../services/recordingService.js';

export const data = new SlashCommandBuilder()
  .setName('end_scrying')
  .setDescription('Stop recording and process the session.');

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  if (!isSessionActive(guildId)) {
    await interaction.reply({ content: 'No active session.', ephemeral: true });
    return;
  }
  await interaction.reply('⏳ Ending session and processing…');
  try {
    const { transcriptText, summaryText } = await endSession(guildId);
    // send transcript as a file if too long
    if (transcriptText.length > 1900) {
      await interaction.followUp({
        files: [{ attachment: Buffer.from(transcriptText), name: 'transcript.txt' }],
      });
    } else {
      await interaction.followUp(`📄 **Transcript**:\n${transcriptText}`);
    }
    await interaction.followUp(`📝 **Summary**:\n${summaryText}`);
  } catch (err) {
    await interaction.editReply({ content: `❌ ${err.message}` });
  }
}