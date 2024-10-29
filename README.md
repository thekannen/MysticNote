# DnD Scrying Notetaker Bot

A custom Discord bot designed for Dungeons & Dragons gameplay, utilizing the OpenAI Whisper API to record and transcribe voice channel interactions in real-time. This bot captures scrying sessions, summarizes them, and organizes logs for easy review.

## Table of Contents
- [Disclaimer](#disclaimer)
- [Features](#features)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Server Recommendations](#server-recommendations)
  - [Quick Install (via Bash Script)](#quick-install-via-bash-script)
  - [Manual Installation (Ubuntu)](#manual-installation-ubuntu)
  - [Configure Environment Variables](#configure-environment-variables)
  - [Configure conf.json Settings](#configure-confjson-settings)
  - [Register the Commands](#register-the-commands)
  - [Start the Bot](#start-the-bot)
  - [Optional to Auto-Start with pm2](#optional-to-auto-start-with-pm2)
- [Updates](#updates)
- [conf.json Settings](#confjson-settings)
  - [inactivityTimeoutMinutes](#inactivitytimeoutminutes)
  - [sessionNameMaxLength](#sessionnamemaxlength)
  - [whisperModel](#whispermodel)
  - [openAIModel](#openaimodel)
- [Usage](#usage)
  - [Commands](#commands)
  - [Example Workflow](#example-workflow)
- [Support This Project](#support-this-project)
- [License](#license)

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

### Server Recommendations
Your server resources will vary depending on the Whisper model you choose and how many recordings you want to process/keep.
These are just general recommendations.

| OS | CPU Threads | RAM | Storage |
| --- | --- | --- | --- |
| Linux Ubuntu 24 LTS | 2-4 | 4-8 | 20-50Gb|
| Windows TBD |

### Quick Install (via Bash Script)

Clone the repository and install dependencies by running the following command:
   ```bash
   bash <(curl -s https://raw.githubusercontent.com/thekannen/dnd-scrying-notetaker/refs/heads/main/setup_discord_bot.sh)
   ```

### Manual Installation ( Ubuntu )
If you prefer to install manually:
1. Install server prerequisites:
   ```bash
   sudo apt update
   sudo apt install -y build-essential ffmpeg python3 python3-pip git
   ```

2. Clone the Repository: 
   ```bash
   cd ~
   git clone https://github.com/thekannen/dnd-scrying-notetaker.git
   cd dnd-scrying-notetaker

3. Install Node.js and npm (using NodeSource for the latest LTS version):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

4. Verify Node.js and npm installation:
   ```bash
   node -v
   npm -v
   ```

5. Install FFmpeg and other dependencies:
   ```bash
   sudo apt update
   sudo apt install -y build-essential ffmpeg python3 python3-pip git
   ```

6. Install Node.js Dependencies:
   ```bash
   sudo npm install
   ```

7. Install PyTorch (required for Whisper) using the command specific to your environment from PyTorch's installation page. For example:
   ```bash
   pip3 install torch
   ```
   
8. Install Whisper:
   ```bash
   pip3 install git+https://github.com/openai/whisper.git
   ```

9. Verify Whisper Installation:
   ```bash
   python3 -c "import whisper; print(whisper.load_model('base'))"
   ```

10. Configure Environment Variables; Create a .env file in the root directory and include your Discord bot token and OpenAI API key:
      ```plaintext
      APP_ID=<YOUR_APP_ID>
      DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
      PUBLIC_KEY=<YOUR_PUBLIC_KEY>
      OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
      ```
11. Configure conf.json settings file:
      ```json
      {
     "inactivityTimeoutMinutes": 5,
     "sessionNameMaxLength": 50,
     "whisperModel": "base",
     "openAIModel": "gpt-4-turbo"
      }
      ```
11. Register the commands:
      ```bash
      node register_commands.js
      ```

12. Start the bot:
      ```bash
      cd ~/dnd-scrying-notetaker/src
      node bot.js
      ```

### Optional to auto-start with pm2
1. Install pm2 to global install as signed in user:
   ```bash
   cd dnd-scrying-notetaker
   sudo npm install pm2 -g

2. Start the bot with pm2:
   Note: Change <user> to match your username.
   ```bash
   pm2 start /home/<user>/dnd-scrying-notetaker/src/bot.js --name "dnd-scrying-bot"

4. Save the pm2 process list and startup:
   ```bash
   pm2 save
   pm2 startup
   ```

---

## Updates

To update the bot, please pull from the git main repository:
   ```bash
   cd ~/dnd-scrying-notetaker
   git pull origin main
   ```

---

### `conf.json` Settings

1. **`inactivityTimeoutMinutes`**  
   Determines the duration, in minutes, for which the bot monitors audio activity during a recording session. If no audio is detected within this timeframe, the session will automatically end due to inactivity.

   - **Type**: Integer  
   - **Default**: `5`  
   - **Example**: Setting this to `10` will keep the session open for 10 minutes without audio before ending.

2. **`sessionNameMaxLength`**  
   Specifies the maximum character length allowed for session names, restricting the length of names given to each scrying session.

   - **Type**: Integer  
   - **Default**: `50`  
   - **Example**: Increasing this value allows for longer session names.

3. **`whisperModel`**  
   Defines the Whisper model used for transcription. Models vary in size and accuracy, with larger models providing better transcription accuracy at the cost of higher computational resources.

   - **Type**: String  
   - **Default**: `"base"`  
   - **Options**: `"tiny"`, `"base"`, `"small"`, `"medium"`, `"large"`  
   - **Example**: Setting this to `"small"` reduces the model size for quicker transcription times.

4. **`openAIModel`**  
   Specifies the OpenAI language model used for generating session summaries. Larger models, such as GPT-4, provide more nuanced summaries but may require higher usage limits or API costs.

   - **Type**: String  
   - **Default**: `"gpt-4-turbo"`  
   - **Options**: `"gpt-3.5-turbo"`, `"gpt-4"`, `"gpt-4-turbo"`  
   - **Example**: `"gpt-3.5-turbo"` is suitable if you require a faster, more cost-effective model for summaries.

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
