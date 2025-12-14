#!/bin/bash
set -euo pipefail

# Configuration
ROOT_DIR="/opt/ot-list"
PB_DIR="$ROOT_DIR/pb"
PB_USER="pocketbase"
SERVICE_NAME="otlist"

# Function to display usage
usage() {
    echo "Usage: $0 {install|update|uninstall} [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  install             Install OT List"
    echo "  update              Update OT List to a new version"
    echo "  uninstall           Uninstall OT List completely"
    echo ""
    echo "Options:"
    echo "  --version VERSION   Specify release version to install (default: 0.0.1)"
    echo "  --from-source       Build and install from Git repository instead of downloading release"
    echo "  --branch BRANCH     Specify branch to build from when using --from-source (default: main)"
    echo ""
    echo "Examples:"
    echo "  $0 install --version 0.0.2              # Install from release v0.0.2"
    echo "  $0 install                              # Install default version from release"
    echo "  $0 install --from-source                # Build and install from main branch"
    echo "  $0 install --from-source --branch dev   # Build and install from dev branch"
    echo "  $0 update --version 0.0.3               # Update to release v0.0.3"
    echo "  $0 update --from-source                 # Update by building from main branch"
    echo "  $0 uninstall                            # Remove OT List"
    echo ""
    echo "Backward compatibility:"
    echo "  $0 install 0.0.2    # Still works - installs version 0.0.2"
    echo "  $0 update 0.0.3     # Still works - updates to version 0.0.3"
    exit 1
}

# Function to build from source
build_from_source() {
    local BRANCH="${1:-main}"
    local REPO_URL="https://github.com/aliaafee/ot-list.git"
    local BUILD_DIR="/tmp/ot-list-build-$(date +%s)"
    
    echo "[*] Building OT List from source..."
    echo "[*] Branch: $BRANCH"
    echo "[*] Build directory: $BUILD_DIR"
    
    # Install build dependencies
    echo "[*] Installing build dependencies..."
    apt install -y git curl || {
        echo "Error: Failed to install build dependencies (git, curl)"
        exit 1
    }
    
    # Clone the repository
    echo "[*] Cloning repository..."
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$BUILD_DIR" || {
        echo "Error: Failed to clone repository from $REPO_URL (branch: $BRANCH)"
        echo "Please check that the branch exists and you have network connectivity"
        exit 1
    }
    cd "$BUILD_DIR"
    
    # Install Node.js v22 using nvm if not already installed
    echo "[*] Checking Node.js installation..."
    if ! command -v node &> /dev/null || ! node --version | grep -q "v22"; then
        echo "[*] Installing Node.js v22 using nvm..."
        echo "[*] Note: Installing from nvm-sh/nvm repository (v0.40.1)"
        
        # Install nvm if not present
        if [ ! -d "$HOME/.nvm" ]; then
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash || {
                echo "Error: Failed to install nvm"
                exit 1
            }
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        else
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        fi
        
        nvm install 22 || {
            echo "Error: Failed to install Node.js v22"
            exit 1
        }
        nvm use 22
    else
        echo "[*] Node.js $(node --version) is already installed"
    fi
    
    # Install npm dependencies
    echo "[*] Installing npm dependencies..."
    npm install || {
        echo "Error: Failed to install npm dependencies"
        exit 1
    }
    
    # Build the frontend
    echo "[*] Building frontend..."
    npm run build || {
        echo "Error: Frontend build failed"
        exit 1
    }
    
    # Copy build artifacts to ROOT_DIR
    echo "[*] Copying build artifacts to $ROOT_DIR..."
    
    # Copy dist directory
    if [ -d "dist" ]; then
        mkdir -p "$ROOT_DIR/dist"
        if [ "$(ls -A dist)" ]; then
            cp -r dist/. "$ROOT_DIR/dist/"
            echo "  ✓ Copied dist/"
        else
            echo "  ✗ Warning: dist/ directory is empty"
        fi
    else
        echo "  ✗ Warning: dist/ directory not found"
    fi
    
    # Copy pb_migrations directory
    if [ -d "pb/pb_migrations" ]; then
        mkdir -p "$ROOT_DIR/pb/pb_migrations"
        if [ "$(ls -A pb/pb_migrations)" ]; then
            cp -r pb/pb_migrations/. "$ROOT_DIR/pb/pb_migrations/"
            echo "  ✓ Copied pb/pb_migrations/"
        else
            echo "  ✗ Warning: pb/pb_migrations/ directory is empty"
        fi
    else
        echo "  ✗ Warning: pb/pb_migrations/ directory not found"
    fi
    
    # Copy pb_schema.json
    if [ -f "pb_schema.json" ]; then
        cp pb_schema.json "$ROOT_DIR/"
        echo "  ✓ Copied pb_schema.json"
    else
        echo "  ✗ Warning: pb_schema.json not found"
    fi
    
    # Copy scripts directory
    if [ -d "scripts" ]; then
        mkdir -p "$ROOT_DIR/scripts"
        if [ "$(ls -A scripts)" ]; then
            cp -r scripts/. "$ROOT_DIR/scripts/"
            echo "  ✓ Copied scripts/"
        else
            echo "  ✗ Warning: scripts/ directory is empty"
        fi
    else
        echo "  ✗ Warning: scripts/ directory not found"
    fi
    
    # Clean up build directory
    echo "[*] Cleaning up build directory..."
    cd /
    rm -rf "$BUILD_DIR"
    echo "[*] Build complete!"
}

# Function to install
install() {
    # Parse arguments
    VERSION="0.0.1"
    FROM_SOURCE=false
    BRANCH="main"
    
    # Check for positional argument (backward compatibility)
    if [ $# -gt 0 ] && [[ ! "$1" =~ ^-- ]]; then
        VERSION="$1"
        shift
    fi
    
    # Parse named arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --version)
                if [ $# -lt 2 ] || [[ "$2" =~ ^-- ]]; then
                    echo "Error: --version requires a value"
                    usage
                fi
                VERSION="$2"
                shift 2
                ;;
            --from-source)
                FROM_SOURCE=true
                shift
                ;;
            --branch)
                if [ $# -lt 2 ] || [[ "$2" =~ ^-- ]]; then
                    echo "Error: --branch requires a value"
                    usage
                fi
                BRANCH="$2"
                shift 2
                ;;
            *)
                echo "Error: Unknown option '$1'"
                usage
                ;;
        esac
    done
    
    # Validate that --branch is only used with --from-source
    if [ "$FROM_SOURCE" = false ] && [ "$BRANCH" != "main" ]; then
        echo "Warning: --branch is only meaningful with --from-source flag, ignoring branch setting"
        BRANCH="main"
    fi
    
    RELEASE_URL="https://github.com/aliaafee/ot-list/releases/download/v${VERSION}/ot-list-v${VERSION}.zip"

    echo "[*] OT List Release Deployment Script"
    if [ "$FROM_SOURCE" = true ]; then
        echo "[*] Deployment mode: Build from source"
        echo "[*] Branch: $BRANCH"
    else
        echo "[*] Deployment mode: Release download"
        echo "[*] Version: $VERSION"
    fi
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

    # Download and extract release OR build from source
    if [ "$FROM_SOURCE" = true ]; then
        build_from_source "$BRANCH"
    else
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
    fi

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

# Function to update
update() {
    # Parse arguments
    VERSION="0.0.1"
    FROM_SOURCE=false
    BRANCH="main"
    
    # Check for positional argument (backward compatibility)
    if [ $# -gt 0 ] && [[ ! "$1" =~ ^-- ]]; then
        VERSION="$1"
        shift
    fi
    
    # Parse named arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --version)
                if [ $# -lt 2 ] || [[ "$2" =~ ^-- ]]; then
                    echo "Error: --version requires a value"
                    usage
                fi
                VERSION="$2"
                shift 2
                ;;
            --from-source)
                FROM_SOURCE=true
                shift
                ;;
            --branch)
                if [ $# -lt 2 ] || [[ "$2" =~ ^-- ]]; then
                    echo "Error: --branch requires a value"
                    usage
                fi
                BRANCH="$2"
                shift 2
                ;;
            *)
                echo "Error: Unknown option '$1'"
                usage
                ;;
        esac
    done
    
    # Validate that --branch is only used with --from-source
    if [ "$FROM_SOURCE" = false ] && [ "$BRANCH" != "main" ]; then
        echo "Warning: --branch is only meaningful with --from-source flag, ignoring branch setting"
        BRANCH="main"
    fi
    
    RELEASE_URL="https://github.com/aliaafee/ot-list/releases/download/v${VERSION}/ot-list-v${VERSION}.zip"

    echo "[*] OT List Update Script"
    if [ "$FROM_SOURCE" = true ]; then
        echo "[*] Deployment mode: Build from source"
        echo "[*] Branch: $BRANCH"
    else
        echo "[*] Deployment mode: Release download"
        echo "[*] Version: $VERSION"
    fi
    echo "[*] Install directory: $ROOT_DIR"
    echo ""

    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then 
        echo "Please run as root or with sudo"
        exit 1
    fi

    # Check if OT List is installed
    if [ ! -d "$ROOT_DIR" ]; then
        echo "Error: OT List is not installed at $ROOT_DIR"
        echo "Please run the install command first"
        exit 1
    fi

    # Stop the service
    echo "[*] Stopping $SERVICE_NAME service..."
    if systemctl is-active --quiet $SERVICE_NAME.service; then
        systemctl stop $SERVICE_NAME.service
        echo "Service stopped"
    fi

    # Backup current installation
    echo "[*] Creating backup of current installation..."
    BACKUP_DIR="${ROOT_DIR}.backup.$(date +%s)"
    cp -r "$ROOT_DIR" "$BACKUP_DIR"
    echo "Backup created at: $BACKUP_DIR"

    # Backup pb_data directory (preserve database and migrations)
    echo "[*] Preserving database..."
    TEMP_DATA_DIR="/tmp/ot-list-data-x-$(date +%s)"
    if [ -d "$PB_DIR/pb_data" ]; then
        cp -r "$PB_DIR/pb_data" "$TEMP_DATA_DIR"
        echo "Database backed up to temp location: $TEMP_DATA_DIR"
    fi

    # Download and extract new release OR build from source
    if [ "$FROM_SOURCE" = true ]; then
        echo "[*] Building from source..."
        # Remove old application files (but keep pb_data)
        find "$ROOT_DIR" -mindepth 1 -maxdepth 1 ! -name 'pb' -exec rm -rf {} +
        if [ -d "$PB_DIR" ]; then
            find "$PB_DIR" -mindepth 1 -maxdepth 1 ! -name 'pb_data' -exec rm -rf {} +
        fi
        
        build_from_source "$BRANCH"
    else
        echo "[*] Downloading new release from GitHub..."
        TMPFILE="/tmp/ot-list-release-$(date +%s).zip"

        if curl -L -f "$RELEASE_URL" -o "$TMPFILE"; then
            echo "[*] Release downloaded successfully"
        else
            echo "Error: Could not download release from $RELEASE_URL"
            echo "Please check that the release exists on GitHub"
            echo "Backup is available at: $BACKUP_DIR"
            exit 1
        fi

        echo "[*] Extracting release..."
        # Remove old application files (but keep pb_data)
        find "$ROOT_DIR" -mindepth 1 -maxdepth 1 ! -name 'pb' -exec rm -rf {} +
        if [ -d "$PB_DIR" ]; then
            find "$PB_DIR" -mindepth 1 -maxdepth 1 ! -name 'pb_data' -exec rm -rf {} +
        fi
        
        unzip -o "$TMPFILE" -d "$ROOT_DIR"
        rm "$TMPFILE"
    fi

    # Restore pb_data directory
    if [ -d "$TEMP_DATA_DIR" ]; then
        echo "[*] Restoring database..."
        mkdir -p "$PB_DIR"
        cp -r "$TEMP_DATA_DIR"/* "$PB_DIR/pb_data"
        rm -rf "$TEMP_DATA_DIR"
        echo "Database restored"
    fi

    # Download latest PocketBase binary
    echo "[*] Downloading latest PocketBase binary..."
    mkdir -p "$PB_DIR"

    LATEST_URL=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
        | grep "browser_download_url.*linux_amd64.zip" \
        | cut -d '"' -f 4 | head -n1)

    if [ -z "$LATEST_URL" ]; then
        echo "Error: Could not fetch PocketBase release URL"
        echo "Backup is available at: $BACKUP_DIR"
        exit 1
    fi

    PB_TMPFILE="/tmp/pocketbase-$(date +%s).zip"
    curl -L "$LATEST_URL" -o "$PB_TMPFILE"
    unzip -o "$PB_TMPFILE" -d "$PB_DIR"
    rm "$PB_TMPFILE"
    echo "[*] PocketBase binary updated"

    # Set ownership
    echo "[*] Setting ownership..."
    chown -R $PB_USER:$PB_USER $ROOT_DIR
    chown root:$PB_USER "$PB_DIR/pocketbase"
    chmod 750 "$PB_DIR/pocketbase"

    # Apply the migrations
    echo "[*] Applying database migrations..."
    sudo -u $PB_USER "$PB_DIR/pocketbase" migrate up

    # Update systemd service file
    echo "[*] Updating systemd service..."
    if [ -f "$ROOT_DIR/scripts/pocketbase.service" ]; then
        cp "$ROOT_DIR/scripts/pocketbase.service" "/etc/systemd/system/$SERVICE_NAME.service"
        systemctl daemon-reload
        echo "Service file updated"
    else
        echo "Warning: pocketbase.service file not found in scripts/"
    fi

    # Start the service
    echo "[*] Starting $SERVICE_NAME service..."
    systemctl start $SERVICE_NAME.service
    
    echo "[*] Service status:"
    systemctl status $SERVICE_NAME.service --no-pager

    echo ""
    echo "✓ Update complete!"
    echo ""
    if [ "$FROM_SOURCE" = true ]; then
        echo "Updated from branch: $BRANCH"
    else
        echo "Updated to version: $VERSION"
    fi
    echo "Backup available at: $BACKUP_DIR"
    echo ""
    echo "You can delete the backup later with:"
    echo "  sudo rm -rf $BACKUP_DIR"
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
    update)
        update "$@"
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