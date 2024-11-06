# PowerShell Script to Set Up MysticNote and Whisper on Windows

# Exit immediately if a command exits with a non-zero status
$ErrorActionPreference = "Stop"

# Update system (Note: Windows doesn't use apt, so no direct equivalent)
Write-Output "Ensuring system dependencies are installed..."

# Install Chocolatey if it's not installed (for package management)
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Output "Installing Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Output "Chocolatey installed successfully."
} else {
    Write-Output "Chocolatey is already installed."
}

# Install dependencies using Chocolatey
Write-Output "Installing build tools, FFmpeg, Python, Git, and Node.js via Chocolatey..."
choco install -y git ffmpeg python nodejs-lts

# Verify installations
Write-Output "Verifying installations..."
Write-Output "Node.js version: $(node -v)"
Write-Output "npm version: $(npm -v)"
Write-Output "Python version: $(python --version)"
Write-Output "Git version: $(git --version)"
Write-Output "FFmpeg version: $(ffmpeg -version | Select-Object -First 1)"

# Clone repository
Write-Output "Cloning the Discord bot repository..."
git clone https://github.com/thekannen/MysticNote.git MysticNote
Set-Location -Path "MysticNote"

# Install project-specific npm dependencies
Write-Output "Installing npm dependencies..."
npm install
Write-Output "NPM dependencies installed successfully."

# Install Whisper and PyTorch dependencies
Write-Output "Installing Whisper and PyTorch dependencies..."
python -m pip install --upgrade pip
python -m pip install torch
python -m pip install git+https://github.com/openai/whisper.git
Write-Output "Whisper and PyTorch dependencies installed successfully."

# Add environment variable setup instructions
Write-Output "Setting up environment variables..."
@"
APP_ID=<YOUR_APP_ID>
DISCORD_TOKEN=<YOUR_DISCORD_BOT_TOKEN>
PUBLIC_KEY=<YOUR_PUBLIC_KEY>
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
"@ | Out-File -Encoding UTF8 .env
Write-Output "Environment variables (.env) file created. Please replace <YOUR_APP_ID>, <YOUR_DISCORD_BOT_TOKEN>, and <YOUR_PUBLIC_KEY> with your actual credentials."

# Final message
Write-Output "Setup complete! Whisper and Discord bot dependencies are installed."
Write-Output "Configure your bot in the .env file, and start it with 'node bot.js' from the MysticNote/src directory."
