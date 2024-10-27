import 'dotenv/config';
import fs from 'fs';

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DND Scrying NoteTaker (https://github.com/thekannen/dnd-scrying-notetaker.git, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
    const endpoint = `applications/${appId}/commands`;
  
    try {
      await DiscordRequest(endpoint, { method: 'PUT', body: commands });
      console.log('Commands successfully registered.');
    } catch (err) {
      console.error('Failed to register commands:', err);
    }
  }
  
  export function generateTimestamp() {
    return new Date().toISOString();
  }

  export function cleanFiles(pattern) {
    const files = fs.readdirSync('./').filter(file => file.includes(pattern));
    files.forEach(file => fs.unlinkSync(file));
    console.log(`Deleted files with pattern "${pattern}":`, files);
  }
  
