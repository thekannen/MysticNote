# PowerShell Script to Set Up MystiNote and Whisper on Windows

# Update system (Note: Windows doesn't use apt, so no direct equivalent)
Write-Output "Ensuring system dependencies are installed..."

# Install Chocolatey if it's not installed (for package management)
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force; 
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; 
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
}

# Install dependencies using Chocolatey
Write-Output "Installing build tools, FFmpeg, Python, Git, and Node.js via Chocolatey..."
choco install -y git ffmpeg python nodejs-lts

# Verify installations
Write-Output "Verifying installations..."
Write-Output "Node.js version: $(node -v)"
Write-Output "npm version: $(npm -v)"
Write-Output "Python version: $(python --version)"

# Clone repository
Write-Output "Cloning the Discord bot repository..."
git clone https://github.com/thekannen/dnd-scrying-notetaker.git MystiNote
Set-Location -Path "dnd-scrying-notetaker"

# Install project-specific npm dependencies
Write-Output "Installing npm dependencies..."
npm install

# Install Whisper and PyTorch dependencies
Write-Output "Installing Whisper and PyTorch dependencies..."
python -m pip install torch
python -m pip install git+https://github.com/openai/whisper.git

# Add environment variable setup instructions
Write-Output "Setting up environment variables..."
@"
APP_ID=<YOUR_APP_ID>
DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
PUBLIC_KEY=<YOUR_PUBLIC_KEY>
"@ | Out-File -Encoding UTF8 .env
Write-Output "Please replace <YOUR_APP_ID>, <YOUR_DISCORD_BOT_TOKEN>, and <YOUR_PUBLIC_KEY> in the .env file."

# Final message
Write-Output "Setup complete! Whisper and Discord bot dependencies are installed. Configure your bot in the .env file, and start it with 'node bot.js' from the MystiNote/src directory."