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
1. Clone the Repository: 
   ```bash
   git clone https://github.com/thekannen/dnd-scrying-notetaker.git
   cd dnd-scrying-notetaker"

2. Install Node.js and npm (using NodeSource for the latest LTS version)
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs"

3. Verify Node.js and npm installation
   ```bash
   node -v
   npm -v"

4. Install FFmpeg and other dependencies:
   ```bash
   sudo apt update
   sudo apt install -y build-essential ffmpeg python3 python3-pip git"

5. Install Node.js Dependencies:
   ```bash
   npm install discord.js @discordjs/voice prism-media form-data node-fetch openai @discordjs/opus ffmpeg-static dotenv"

6. Configure Environment Variables: Create a .env file in the root directory and include your Discord bot token and OpenAI API key:
   ```plaintext
   APP_ID=<YOUR_APP_ID>
   DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
   PUBLIC_KEY=<YOUR_PUBLIC_KEY>
   OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>"

7. Start the bot
   ```bash
   node app.js"

---

## Usage

The DnD Scrying Notetaker Bot provides a set of magical commands to interact with and control scrying sessions. Use these commands within your Discord server to capture, transcribe, and review voice channel interactions.

### Commands

- **`/gaze`**
  - **Description**: The bot enters the voice channel, ready to capture the voices of those unseen.
  
- **`/leave`**
  - **Description**: The bot vanishes from the voice channel, ending the magical vision.
  
- **`/begin_scrying`**
  - **Description**: Initiates recording of spoken words in the voice channel, as if seen through a crystal ball.
  
- **`/end_scrying`**
  - **Description**: Stops the current recording, finalizing the vision and preparing it for transcription.
  
- **`/reveal_summary`**
  - **Description**: Receives a concise summary of the last scrying session, providing an overview of the captured voices.
  
- **`/complete_vision`**
  - **Description**: Retrieves the full transcription of the scryed voices, as written by the orb.

### Example Workflow

1. **Start a Scrying Session**: Enter the voice channel and initiate recording with `/gaze` followed by `/begin_scrying`.
2. **End the Session**: Use `/end_scrying` and then `/leave` to complete the session.
3. **Retrieve Transcriptions**: Use `/reveal_summary` for a concise summary or `/complete_vision` for a full transcription of the session.

Each command offers a unique interaction with the bot, allowing for seamless integration into your D&D sessions.

---

## Support This Project

If you enjoy using the DnD Scrying Notetaker Bot and would like to buy me a coffee, below is a donation link! Otherwise, enjoy absolutely free :)

[Donate via PayPal](https://www.paypal.com/donate/?business=HDGMTT3QUAEJQ&no_recurring=1&currency_code=USD)

---
 
## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](https://github.com/thekannen/dnd-scrying-notetaker/tree/main?tab=GPL-3.0-1-ov-file) file for more details.
   ```plaintext
   This README provides clearer installation and usage instructions, and it aligns with GNU GPL v3 licensing. Let me know if you need further adjustments!"
