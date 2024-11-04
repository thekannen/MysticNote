# This is still a work in progress and may not yet function as intended. If you've discovered this page, run at your own risk!

# MysticNote

A versatile Discord bot built to record, transcribe, and summarize voice channel interactions. Using OpenAI's Whisper API, this bot captures conversations, generates summaries, and organizes transcriptions for convenient playback and review. Whether for gaming sessions, meetings, or casual conversations, this bot provides transcription services and structured records of each session.

## Table of Contents
- [This is still a work in progress and may not yet function as intended. If you've discovered this page, run at your own risk!](#this-is-still-a-work-in-progress-and-may-not-yet-function-as-intended-if-youve-discovered-this-page-run-at-your-own-risk)
- [MysticNote](#mysticnote)
  - [Table of Contents](#table-of-contents)
  - [Disclaimer](#disclaimer)
  - [Features](#features)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Server Recommendations](#server-recommendations)
    - [Quick Install Scripts](#quick-install-scripts)
      - [Ubuntu](#ubuntu)
      - [Windows](#windows)
    - [Manual Installation ( Ubuntu )](#manual-installation--ubuntu-)
      - [Optional to auto-start with pm2](#optional-to-auto-start-with-pm2)
    - [Manual Installation ( Windows )](#manual-installation--windows-)
      - [Optional to auto-start with pm2](#optional-to-auto-start-with-pm2-1)
  - [Updates](#updates)
    - [`conf.json` Settings](#confjson-settings)
- [Usage](#usage)
    - [Commands](#commands)
- [Example Workflow](#example-workflow)
  - [Support This Project](#support-this-project)
  - [License](#license)

---

## Disclaimer
This application was developed with the assistance of OpenAI's ChatGPT to streamline the coding process and enhance functionality. While ChatGPT provided guidance during development, it is not involved in ongoing maintenance or support for this project. For any issues, questions, or feature requests, please contact the repository owner directly, as they are solely responsible for the code's upkeep and improvements.

---

## Features

- **Real-Time Voice Recording**: Joins a Discord voice channel and records multiple users.
- **Automatic Transcription**: Uses OpenAI Whisper to transcribe audio after recording has finished.
- **Session Summaries**: Provides both full transcriptions and concise summaries.
- **Multi-User Support**: Records multiple users and tracks individual sessions.
- **Storage Management**: Configurable storage settings, ensuring organized and efficient usage.

---

## Installation

### Prerequisites

1. **Discord Bot App ID, Public Key, and Token**  
   To set up a Discord bot, you need to register it in the [Discord Developer Portal](https://discord.com/developers/applications) and add it to your server.

   - **Follow the Discord documentation**: Use [this guide](https://discord.com/developers/docs/quick-start/getting-started#step-1-creating-an-app) to create and register the bot app.
   - **Setting Permissions**: Configure the bot’s permissions correctly in the Developer Portal to allow it to join channels, send messages, and use slash commands.
     - Go to **"Installation"** and scroll to **"Default Install Settings"**.
     - Under **"SCOPES"** for *Guild Install*, ensure **"bot"** is selected.
     - In **"PERMISSIONS"**, enable the following options:
       - **Connect**
       - **Send Messages**
       - **Speak**
       - **Use Slash Commands**
       - **View Channels**

2. **OpenAI API Key**  
   Obtain an API key from [OpenAI](https://platform.openai.com/) to allow the bot to use the Whisper and GPT models.

   - **Follow OpenAI’s documentation**: Use [this guide](https://platform.openai.com/docs/quickstart) to generate your API key.
   - **Note**: OpenAI’s API is a paid service, and usage fees will apply based on the models you use and the volume of requests.

### Server Recommendations
Your server resources will vary depending on the Whisper model you choose and how many recordings you want to process/keep.
These are just general recommendations. Read more about Whisper [here](https://github.com/openai/whisper?tab=readme-ov-file#available-models-and-languages).

| CPU Threads | RAM | Storage |
| --- | --- | --- |
| 2-4 | 4-8 | 20-50Gb|

### Quick Install Scripts

Clone the repository and install dependencies by running the following scripts:
#### Ubuntu
   ```bash
   bash <(curl -s https://raw.githubusercontent.com/thekannen/MysticNote/refs/heads/main/setup/setupMysticNoteUbuntu.sh)
   ```

#### Windows
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('[changepath](https://raw.githubusercontent.com/thekannen/MysticNote/refs/heads/main/setup/setupMysticNoteWindows.ps1)'))
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
   git clone https://github.com/thekannen/MysticNote.git
   cd MysticNote
   ```

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
     "openAIModel": "gpt-4-turbo",
     "saveRecordings": true, 
     "audioQuality": "low"
      }
      ```
12. Register the commands:
      ```bash
      node register_commands.js
      ```

13. Start the bot:
      ```bash
      cd ~/MysticNote/src
      node bot.js
      ```

#### Optional to auto-start with pm2
1. Install pm2 to global install as signed in user:
   ```bash
   cd MysticNote
   sudo npm install pm2 -g
   ```

2. Start the bot with pm2:
   Note: Change <user> to match your username.
   ```bash
   pm2 start /home/<user>/MysticNote/src/bot.js --name "MysticNote"
   ```

3. Save the pm2 process list and startup:
   ```bash
   pm2 save
   pm2 startup
   ```

### Manual Installation ( Windows )
If you prefer to install manually:
1. Install server prerequisites:
   - Open PowerShell as Administrator and run the following commands to install necessary tools using Chocolatey, a Windows package manager:
      ```powershell
      # Install Chocolatey if not already installed
      Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

      # Install prerequisites
      choco install -y git ffmpeg python nodejs-lts
      ```

2. Clone the Repository: 
   - In PowerShell, run:
      ```powershell
      cd ~
      git clone https://github.com/thekannen/MysticNote.git
      cd MysticNote
      ```

3. Install Node.js Dependencies:
   ```powershell
   npm install
   ```

4. Install PyTorch (required for Whisper):
   ```powershell
   python -m pip install torch
   ```

5. Install Whisper:
   ```powershell
   python -m pip install git+https://github.com/openai/whisper.git
   ```

6. Verify Whisper Installation:
   ```powershell
   python -c "import whisper; print(whisper.load_model('base'))"
   ```

7. Configure Environment Variables; Create a .env file in the root directory and include your Discord bot token and OpenAI API key:
      ```plaintext
      APP_ID=<YOUR_APP_ID>
      DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
      PUBLIC_KEY=<YOUR_PUBLIC_KEY>
      OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
      ```
8. Configure conf.json settings file:
      ```json
      {
     "inactivityTimeoutMinutes": 5,
     "sessionNameMaxLength": 50,
     "whisperModel": "base",
     "openAIModel": "gpt-4-turbo",
     "saveRecordings": true, 
     "audioQuality": "low"
      }
      ```
9. Register the commands:
      ```powershell
      node register_commands.js
      ```

10. Start the bot:
      ```powershell
      cd ~/MysticNote/src
      node bot.js
      ```

#### Optional to auto-start with pm2
1. Install pm2 to global install as signed in user:
   ```powershell
   npm install pm2 -g
   ```

2. Start the bot with pm2:
   Note: Change <user> to match your username.
   ```powershell
     pm2 start .\src\bot.js --name "MysticNote"
   ```

3. Save the pm2 process list and startup:
   ```powershell
   pm2 save
   ```

---

## Updates

To update the bot, please pull from the git main repository:
   ```bash
   cd ~/MysticNote
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
   Specifies the OpenAI language model used for generating session summaries. Larger models, such as those in the GPT-4 series, offer more nuanced summaries but may have higher usage limits or API costs. The selected model will affect the quality, detail, and potential cost of the summary generation.

   - **Type**: String  
   - **Default**: `"gpt-4o"`  
   - **Options**:
     - ** Please go here to learn about the available text models: [OpenAI Models](https://platform.openai.com/docs/models/)
   - **Example**: Setting `"gpt-3.5-turbo"` is suitable if you want a faster, more cost-effective model, particularly for shorter summaries.


5. **`saveRecordings`**  
   Determines whether to keep or delete audio recordings after they have been successfully transcribed and summarized. Set to false if you want to automatically delete recordings, reducing storage use, or set to true if you prefer to retain the original audio files for future reference.

   - **Type**: Boolean  
   - **Default**: `"true"`  
   - **Example**: `"False` if you want to automatically delete recordings after they have been transcribed.

6. **`audioQuality`**  
   Controls the quality of audio recordings for transcription, with options to balance between audio clarity and file size. Higher quality settings provide clearer audio but increase storage use. Lower quality is generally sufficient for transcription accuracy while minimizing file size.

   - **Type**: String  
   - **Default**: `"low"`  
   - **Options**: `"low"`, `"medium"`, `"high"`  
   - **Example**: `"high"` for maximum audio clarity if storage space is not a concern, or "low" to minimize file size while maintaining transcribable quality.

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

If you enjoy using MysticNote and would like to buy me a coffee, you can donate via PayPal.
[Donate via PayPal](https://www.paypal.com/donate/?business=HDGMTT3QUAEJQ&no_recurring=1&currency_code=USD)

---
 
## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](https://github.com/thekannen/MysticNote/tree/main?tab=GPL-3.0-1-ov-file) file for more details.
Note: Portions of this code were developed with the assistance of OpenAI's ChatGPT. However, all rights to the code are retained by the repository owner, and this project is licensed in full under the terms of the GNU General Public License v3.0.
