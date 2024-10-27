# DnD Scrying Notetaker Bot

A custom Discord bot designed for Dungeons & Dragons gameplay, utilizing the OpenAI Whisper API to record and transcribe voice channel interactions in real-time. This bot captures scrying sessions, summarizes them, and organizes logs for easy review.

---

## Disclaimer
This application was created with extensive guidance from OpenAI's ChatGPT to help streamline the development process and refine functionality. Any issues or questions related to the code should be directed to the repository owner, as ChatGPT was used as a tool in the creation process and is not responsible for ongoing maintenance or support.

---

## Features

- **Real-Time Voice Recording**: Joins a Discord voice channel and records multiple users.
- **Automatic Transcription**: Uses OpenAI Whisper API to transcribe audio in real-time.
- **Session Summaries**: Provides both full transcriptions and concise summaries.
- **Multi-User Support**: Records multiple users and tracks individual sessions.
- **Storage Management**: Configurable storage settings, ensuring organized and efficient usage.

---

## Installation

### Prerequisites

1. Discord Bot App ID, Public Key, and Token: Register a bot in the [Discord Developer Portal](https://discord.com/developers/applications) and add it to your server.
2. OpenAI API Key: Get an API key from [OpenAI](https://platform.openai.com/).

Ensure you have the following on your server:
- **Ubuntu**
- **Node.js** (version 20 or higher)
- **FFmpeg**: Required for audio processing
- **Git**

### Quick Install (via Bash Script)

1. Clone the repository and install dependencies by running the following command:
   ```bash
   bash <(curl -s https://raw.githubusercontent.com/thekannen/dnd-scrying-notetaker/refs/heads/main/setup_discord_bot.sh)"

### Manual Installation
If you prefer to install manually:
1. Install server prerequisites:
   ```bash
   sudo apt update
   sudo apt install -y build-essential ffmpeg python3 python3-pip git

2. Clone the Repository: 
   ```bash
   git clone https://github.com/thekannen/dnd-scrying-notetaker.git
   cd dnd-scrying-notetaker

3. Install Node.js and npm (using NodeSource for the latest LTS version):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs

4. Verify Node.js and npm installation:
   ```bash
   node -v
   npm -v

5. Install FFmpeg and other dependencies:
   ```bash
   sudo apt update
   sudo apt install -y build-essential ffmpeg python3 python3-pip git

6. Install Node.js Dependencies:
   ```bash
   npm install discord.js @discordjs/voice prism-media form-data node-fetch openai @discordjs/opus ffmpeg-static dotenv

7. Configure Environment Variables: Create a .env file in the root directory and include your Discord bot token and OpenAI API key:
   ```plaintext
   APP_ID=<YOUR_APP_ID>
   DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
   PUBLIC_KEY=<YOUR_PUBLIC_KEY>
   OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>

8. Register the commands:
   ```bash
   node register_commands.js

9. Start the bot:
   ```bash
   node app.js

### Optional to auto-start with pm2
1. Install pm2 to global install as signed in user:
   ```bash
   cd dnd-scrying-notetaker
   sudo npm install pm2 -g

2. Start the bot with pm2:
   ```bash
   pm2 start app.js --name "dnd-scrying-bot"

3. Save the pm2 process list and startup:
   ```bash
   pm2 save
   pm2 startup

---

## Updates

1. To update the bot, please pull from the git main repository:
   ```bash
   cd dnd-scrying-notetaker
   git pull origin main

---

# Usage

The bot provides a collection of commands to interact with voice channels and manage transcriptions. Here is a summary of the available commands:

### Commands

1. **`/gaze`**
   - The bot enters the voice channel, peering into the voices of the unseen.

2. **`/leave`**
   - The bot vanishes, ending the magical vision and leaving the voice channel.

3. **`/begin_scrying`**
   - Start recording the words spoken in the channel, capturing them as if seen through a crystal ball.
   - **Options**: 
     - `session`: The name of the session (up to 50 characters, must be unique).

4. **`/end_scrying`**
   - Cease recording, finalizing the vision.

5. **`/consult_the_texts`**
   - Lists all the scrying sessions saved to the wizard's tome.

6. **`/reveal_summary`**
   - Receive a concise vision of the last scrying session.
   - **Options**: 
     - `session`: The name of the session you wish to summarize.

7. **`/complete_vision`**
   - Retrieve the full record of the scryed voices, as written by the orb.
   - **Options**: 
     - `session`: The name of the session you wish to reveal.

8. **`/delete_session`**
   - Deletes all recordings and transcripts for a specific session. Use with caution!
   - **Options**: 
     - `session`: The name of the session you wish to delete.

9. **`/purge`**
   - Deletes all recordings and transcripts for every session. Use with extreme caution!
   - **Options**: 
     - `confirmation`: Type "y" to delete everything! This cannot be undone!


# Example Workflow

Here's an example of how you might use the bot commands to record, summarize, and manage voice channel sessions:

1. **Entering a Voice Channel**:  
   - Use the command `/gaze` to have the bot join the voice channel.

2. **Start Recording**:  
   - Run `/begin_scrying session:YourSessionName` to begin recording the session. Make sure the session name is unique and within 50 characters.

3. **End Recording**:  
   - Use `/end_scrying` to stop the recording when done.

4. **Check Available Sessions**:  
   - Use `/consult_the_texts` to see a list of saved scrying sessions.

5. **Summarize a Session**:  
   - To get a summary of a recorded session, use `/reveal_summary session:YourSessionName`.

6. **Retrieve the Full Transcript**:  
   - Run `/complete_vision session:YourSessionName` to access the full transcription of the session.

7. **Delete a Session**:  
   - Use `/delete_session session:YourSessionName` if you no longer need the recording and transcription for a specific session.

8. **Clear All Sessions**:  
   - With caution, use `/purge confirmation:y` to delete all recordings and transcriptions from every session.


Each command offers a unique interaction with the bot, allowing for seamless integration into your D&D sessions.

---

## Support This Project

If you enjoy using the DnD Scrying Notetaker Bot and would like to buy me a coffee, below is a donation link! Otherwise, enjoy!

[Donate via PayPal](https://www.paypal.com/donate/?business=HDGMTT3QUAEJQ&no_recurring=1&currency_code=USD)

---
 
## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](https://github.com/thekannen/dnd-scrying-notetaker/tree/main?tab=GPL-3.0-1-ov-file) file for more details.
   ```plaintext
   This README provides clearer installation and usage instructions, and it aligns with GNU GPL v3 licensing. Let me know if you need further adjustments!"
