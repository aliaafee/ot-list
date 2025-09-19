#!/bin/bash
set -euo pipefail

ROOT_DIR="/opt/ot-list"
PB_DIR="$ROOT_DIR/pb"
PB_USER="pocketbase"

# Create application directory
echo "[*] Creating application directory..."
sudo mkdir -p $ROOT_DIR

# Create dedicated user
echo "[*] Creating Pocketbase user..."
if ! id "$PB_USER" &>/dev/null; then
    sudo useradd -r -s /usr/sbin/nologin -d $ROOT_DIR $PB_USER
fi

# Install prerequisites
echo "[*] Installing prerequisites..."
sudo apt update
sudo apt install -y git curl unzip
echo "[*] Installing node.js v22..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 22

# Fix permissions
echo "[*] Setting ownership..."
sudo chown -R $PB_USER:$PB_USER $ROOT_DIR

# Clone repository
echo "[*] Cloning repository..."
if [ ! -d "$ROOT_DIR/.git" ]; then
    sudo -u $PB_USER git clone https://github.com/aliaafee/ot-list.git $ROOT_DIR
else
    echo "Repo already cloned, pulling changes."
    sudo -u $PB_USER git -C $ROOT_DIR pull
fi

# Install dependencies
echo "[*] Installing npm dependencies..."
cd $ROOT_DIR
npm install

# Download PocketBase binary
echo "[*] Downloading latest PocketBase release..."
sudo -u $PB_USER mkdir -p "$PB_DIR"
LATEST_URL=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
    | grep "browser_download_url.*linux_amd64.zip" \
    | cut -d '"' -f 4 | head -n1)

if [ -z "$LATEST_URL" ]; then
    echo "Could not fetch PocketBase release URL. Exiting."
    exit 1
fi

TMPFILE="$PB_DIR/download.zip"
sudo -u $PB_USER curl -L "$LATEST_URL" -o "$TMPFILE"
sudo -u $PB_USER unzip -o "$TMPFILE" -d "$PB_DIR"
rm "$TMPFILE"

# Build frontend
echo "[*] Building frontend..."
npm run build

# Install systemd service
echo "[*] Installing systemd service..."
if [ -f "$ROOT_DIR/scripts/pocketbase.service" ]; then
    sudo cp $ROOT_DIR/scripts/pocketbase.service /etc/systemd/system/pocketbase.service
else
    echo "Warning: pocketbase.service file not found in scripts/"
fi

# Reload systemd and enable service
echo "[*] Enabling and starting PocketBase service..."
sudo systemctl daemon-reload
sudo systemctl enable pocketbase.service
sudo systemctl start pocketbase.service

echo "Deployment complete!"
