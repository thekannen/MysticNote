# DnD Scrying Notetaker Bot

A custom Discord bot designed for Dungeons & Dragons gameplay, utilizing the OpenAI Whisper API to record and transcribe voice channel interactions in real-time. This bot captures scrying sessions, summarizes them, and organizes logs for easy review.

---

### Features

- **Real-Time Voice Recording**: Joins a Discord voice channel and records multiple users.
- **Automatic Transcription**: Uses OpenAI Whisper API to transcribe audio in real-time.
- **Session Summaries**: Provides both full transcriptions and concise summaries.
- **Multi-User Support**: Records multiple users and tracks individual sessions.
- **Storage Management**: Configurable storage settings, ensuring organized and efficient usage.

---

## Installation

### Prerequisites

Ensure you have the following on your server:
- **Ubuntu 24.04 LTS**
- **Node.js** (version 20 or higher)
- **FFmpeg**: Required for audio processing
- **Git**

### Quick Install (via Bash Script)

1. Clone the repository and install dependencies by running the following command:
   ```bash
   bash <(curl -s https://raw.githubusercontent.com/thekannen/dnd-scrying-notetaker/refs/heads/main/setup_discord_bot.sh)"

### Disclaimer
This application was created with extensive guidance from OpenAI's ChatGPT to help streamline the development process and refine functionality. Any issues or questions related to the code should be directed to the repository owner, as ChatGPT was used as a tool in the creation process and is not responsible for ongoing maintenance or support.
