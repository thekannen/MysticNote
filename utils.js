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

// Registers global commands for the bot.
export async function InstallGlobalCommands(appId, commands) {
    const endpoint = `applications/${appId}/commands`;
  
    try {
      await DiscordRequest(endpoint, { method: 'PUT', body: commands });
      console.log('Commands successfully registered.');
    } catch (err) {
      console.error('Failed to register commands:', err);
    }
  }
  
  // Generates a timestamp in ISO UTC format.
  export function generateTimestamp() {
    return new Date().toISOString();
  }

  // Deletes files matching a specific pattern from the current directory.
  export function cleanFiles(pattern) {
    const files = fs.readdirSync('./').filter(file => file.includes(pattern));
    files.forEach(file => fs.unlinkSync(file));
    console.log(`Deleted files with pattern "${pattern}":`, files);
  }

// Validates if the session name is unique and meets length requirements.
export function validateSessionName(sessionName) {
  if (sessionName.length > 20) {
    return 'Session name must be no more than 20 characters.';
  }

  const sessionFolder = path.join(recordingsDir, sessionName);
  if (fs.existsSync(sessionFolder)) {
    return 'A session with this name already exists. Please choose a different name.';
  }

  return true;
}

// Creates a directory for the given session.
export function createSessionDirectory(sessionName) {
  const sessionFolder = path.join(recordingsDir, sessionName);
  fs.mkdirSync(sessionFolder, { recursive: true });
}