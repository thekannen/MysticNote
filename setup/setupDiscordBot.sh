#!/bin/bash

# Update package lists and install system dependencies
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "Installing build essentials, FFmpeg, and other dependencies..."
sudo apt install -y build-essential ffmpeg python3 python3-pip git

# Install Node.js and npm (using NodeSource for the latest LTS version)
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js and npm installation
echo "Node.js version:"
node -v
echo "npm version:"
npm -v

# Clone repository
echo "Cloning the Discord bot repository..."
git clone https://github.com/thekannen/dnd-scrying-notetaker.git dnd-scrying-notetaker
cd dnd-scrying-notetaker

# Install project-specific npm dependencies
echo "Installing npm dependencies..."
sudo npm install

# Install Whisper and its dependencies
echo "Installing Whisper and PyTorch dependencies..."
pip3 install torch  # Ensure you install the correct version for your environment from https://pytorch.org/get-started/locally/
pip3 install git+https://github.com/openai/whisper.git

# Add environment variable setup instructions
echo "Setting up environment variables..."
cat <<EOF > .env
APP_ID=<YOUR_APP_ID>
DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
PUBLIC_KEY=<YOUR_PUBLIC_KEY>
EOF
echo "Please replace <YOUR_APP_ID>, <YOUR_DISCORD_BOT_TOKEN>, and <YOUR_PUBLIC_KEY> in the .env file."

# Final message
echo "Setup complete! Whisper and Discord bot dependencies are installed. Configure your bot in the .env file, and start it with 'node bot.js' from the dnd-scrying-notetaker/src directory."

# Ensure script is executable
chmod +x setupDiscordBot.sh
