#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Update package lists and install system dependencies
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "Installing build essentials, FFmpeg, Python3, pip3, and Git..."
sudo apt install -y build-essential ffmpeg python3 python3-pip git

# Install Node.js and npm (using NodeSource for the latest LTS version)
echo "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js and npm installation
echo "Verifying Node.js and npm installation..."
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Clone repository
echo "Cloning the Discord bot repository..."
git clone https://github.com/thekannen/MysticNote.git MysticNote
cd MysticNote

#Adjust ownership
sudo chown -R $(whoami) MysticNote

# Install project-specific npm dependencies
echo "Installing npm dependencies..."
npm install
echo "NPM dependencies installed successfully."

# Install Whisper and its dependencies
echo "Installing Whisper and PyTorch dependencies..."
pip3 install torch  # For CPU: pip3 install torch
# For GPU support, refer to https://pytorch.org/get-started/locally/
pip3 install git+https://github.com/openai/whisper.git
echo "Whisper and PyTorch dependencies installed successfully."

# Add environment variable setup instructions
echo "Setting up environment variables..."
cat <<EOF > .env
APP_ID=<YOUR_APP_ID>
DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
PUBLIC_KEY=<YOUR_PUBLIC_KEY>
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
EOF
echo "Environment variables (.env) file created. Please replace <YOUR_APP_ID>, <YOUR_DISCORD_BOT_TOKEN>, and <YOUR_PUBLIC_KEY> with your actual credentials."

# Final message
echo "Setup complete! Whisper and Discord bot dependencies are installed."
echo "Configure your bot in the .env file, and start it with 'node bot.js' from the MysticNote/src directory."

# Note: Ensure the script is executable before running it
# Example: chmod +x setupMysticNoteUbuntu.sh