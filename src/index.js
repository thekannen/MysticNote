import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.Channel],
});

// load commands
client.commands = new Collection();
const commandsPath = path.resolve('src/commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const { data, execute } = await import(`./commands/${file}`);
  client.commands.set(data.name, { data, execute });
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('❌ An error occurred executing that command.');
    } else {
      await interaction.reply({ content: '❌ Error executing command.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);