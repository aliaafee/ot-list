#!/bin/bash
set -euo pipefail

# Configuration
VERSION="${1:-0.0.1}"  # Default version or passed as argument
RELEASE_URL="https://github.com/aliaafee/ot-list/releases/download/v${VERSION}/ot-list-v${VERSION}.zip"
ROOT_DIR="/opt/ot-list"
PB_DIR="$ROOT_DIR/pb"
PB_USER="pocketbase"
SERVICE_NAME="otlist"

echo "[*] OT List Release Deployment Script"
echo "[*] Version: $VERSION"
echo "[*] Install directory: $ROOT_DIR"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or with sudo"
    exit 1
fi

# Install prerequisites
echo "[*] Installing prerequisites..."
apt update
apt install -y curl unzip systemd

# Create dedicated user
echo "[*] Creating PocketBase user..."
if ! id "$PB_USER" &>/dev/null; then
    useradd -r -s /usr/sbin/nologin -d $ROOT_DIR $PB_USER
    echo "User '$PB_USER' created"
else
    echo "User '$PB_USER' already exists"
fi

# Create application directory
echo "[*] Creating application directory..."
mkdir -p $ROOT_DIR
cd $ROOT_DIR

# Download and extract release
echo "[*] Downloading release from GitHub..."
TMPFILE="$ROOT_DIR/ot-list-release.zip"

if curl -L -f "$RELEASE_URL" -o "$TMPFILE"; then
    echo "[*] Release downloaded successfully"
else
    echo "Error: Could not download release from $RELEASE_URL"
    echo "Please check that the release exists on GitHub"
    exit 1
fi

echo "[*] Extracting release..."
unzip -o "$TMPFILE" -d "$ROOT_DIR"
rm "$TMPFILE"

# Download PocketBase binary
echo "[*] Downloading latest PocketBase binary..."
mkdir -p "$PB_DIR"

LATEST_URL=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
    | grep "browser_download_url.*linux_amd64.zip" \
    | cut -d '"' -f 4 | head -n1)

if [ -z "$LATEST_URL" ]; then
    echo "Error: Could not fetch PocketBase release URL"
    exit 1
fi

PB_TMPFILE="$PB_DIR/pocketbase.zip"
curl -L "$LATEST_URL" -o "$PB_TMPFILE"
unzip -o "$PB_TMPFILE" -d "$PB_DIR"
rm "$PB_TMPFILE"
chmod +x "$PB_DIR/pocketbase"
echo "[*] PocketBase binary installed"

# Set ownership
echo "[*] Setting ownership..."
chown -R $PB_USER:$PB_USER $ROOT_DIR

# Install systemd service
echo "[*] Installing systemd service..."
if [ -f "$ROOT_DIR/scripts/pocketbase.service" ]; then
    cp "$ROOT_DIR/scripts/pocketbase.service" "/etc/systemd/system/$SERVICE_NAME.service"
    
    # Reload systemd and enable service
    echo "[*] Enabling and starting $SERVICE_NAME service..."
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME.service
    systemctl restart $SERVICE_NAME.service
    
    echo "[*] Service status:"
    systemctl status $SERVICE_NAME.service --no-pager
else
    echo "Warning: pocketbase.service file not found in scripts/"
    echo "You will need to manually configure the systemd service"
fi

echo ""
echo "✓ Deployment complete!"
echo ""
echo "Application installed to: $ROOT_DIR"
echo "Service name: $SERVICE_NAME"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status $SERVICE_NAME    # Check service status"
echo "  sudo systemctl restart $SERVICE_NAME   # Restart service"
echo "  sudo systemctl logs $SERVICE_NAME      # View logs"
echo "  sudo journalctl -u $SERVICE_NAME -f    # Follow logs"
echo ""
