#!/bin/bash
set -euo pipefail

# Configuration
ROOT_DIR="/opt/ot-list"
PB_DIR="$ROOT_DIR/pb"
PB_USER="pocketbase"
SERVICE_NAME="otlist"

# Function to display usage
usage() {
    echo "Usage: $0 {install|uninstall} [VERSION]"
    echo ""
    echo "Commands:"
    echo "  install [VERSION]   Install OT List (default version: 0.0.1)"
    echo "  uninstall           Uninstall OT List completely"
    echo ""
    echo "Examples:"
    echo "  $0 install 0.0.2    # Install version 0.0.2"
    echo "  $0 install          # Install default version"
    echo "  $0 uninstall        # Remove OT List"
    exit 1
}

# Function to install
install() {
    VERSION="${1:-0.0.1}"  # Default version or passed as argument
    RELEASE_URL="https://github.com/aliaafee/ot-list/releases/download/v${VERSION}/ot-list-v${VERSION}.zip"

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
    echo "[*] PocketBase binary installed"

    # Set ownership
    echo "[*] Setting ownership..."
    chown -R $PB_USER:$PB_USER $ROOT_DIR
    # Set PocketBase binary ownership to root with execute permissions for pocketbase user
    chown root:$PB_USER "$PB_DIR/pocketbase"
    chmod 750 "$PB_DIR/pocketbase"

    # Apply the migrations
    echo "[*] Applying database migrations..."
    sudo -u $PB_USER "$PB_DIR/pocketbase" migrate up

    # Prompt for initial admin user creation
    echo ""
    read -p "Do you want to create an admin user now? (y/N): " CREATE_ADMIN
    if [[ "$CREATE_ADMIN" =~ ^[Yy]$ ]]; then
        echo "[*] Creating initial admin user..."
        read -p "Enter admin email: " ADMIN_EMAIL
        read -s -p "Enter admin password: " ADMIN_PASSWORD
        echo ""
        
        # Create admin user
        sudo -u $PB_USER "$PB_DIR/pocketbase" superuser create "$ADMIN_EMAIL" "$ADMIN_PASSWORD"
        echo "[*] Admin user created successfully"
    else
        echo "[*] Skipping admin user creation"
        echo "    You can create an admin user later by running:"
        echo "    sudo -u $PB_USER $PB_DIR/pocketbase superuser create <email> <password>"
    fi

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
    echo "To get the token for the admin user, if not already created, check the logs after the first start:"
    echo "  sudo systemctl --full --no-pager  status $SERVICE_NAME | grep -A 1 \"superuser account:\""
    echo ""
}

# Function to uninstall
uninstall() {
    echo "[*] OT List Uninstall Script"
    echo "[*] This will remove OT List completely from your system"
    echo ""

    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then 
        echo "Please run as root or with sudo"
        exit 1
    fi

    # Confirm uninstallation
    read -p "Are you sure you want to uninstall OT List? This will delete all data! (yes/NO): " CONFIRM
    if [[ "$CONFIRM" != "yes" ]]; then
        echo "Uninstall cancelled"
        exit 0
    fi

    # Stop and disable service
    echo "[*] Stopping and disabling $SERVICE_NAME service..."
    if systemctl is-active --quiet $SERVICE_NAME.service; then
        systemctl stop $SERVICE_NAME.service
        echo "Service stopped"
    fi

    if systemctl is-enabled --quiet $SERVICE_NAME.service; then
        systemctl disable $SERVICE_NAME.service
        echo "Service disabled"
    fi

    # Remove service file
    if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
        echo "[*] Removing systemd service file..."
        rm "/etc/systemd/system/$SERVICE_NAME.service"
        systemctl daemon-reload
        echo "Service file removed"
    fi

    # Move application directory to backup
    if [ -d "$ROOT_DIR" ]; then
        echo "[*] Moving application directory to backup..."
        BACKUP_DIR="${ROOT_DIR}.old.$(date +%s)"
        mv "$ROOT_DIR" "$BACKUP_DIR"
        echo "Application directory moved to: $BACKUP_DIR"
        echo "You can manually delete this backup later if needed"
    fi

    # Remove user
    echo "[*] Removing PocketBase user..."
    if id "$PB_USER" &>/dev/null; then
        userdel $PB_USER
        echo "User '$PB_USER' removed"
    else
        echo "User '$PB_USER' does not exist"
    fi

    echo ""
    echo "✓ Uninstall complete!"
    echo ""
    echo "OT List has been completely removed from your system."
    echo ""
}

# Main script logic
if [ $# -eq 0 ]; then
    usage
fi

COMMAND=$1
shift  # Remove first argument

case "$COMMAND" in
    install)
        install "$@"
        ;;
    uninstall)
        uninstall
        ;;
    *)
        echo "Error: Unknown command '$COMMAND'"
        echo ""
        usage
        ;;
esac