#!/bin/bash
set -euo pipefail

# Configuration
DEFAULT_VERSION="0.1.0"
ROOT_DIR="/opt/ot-list"
PB_DIR="$ROOT_DIR/pb"
PB_USER="pocketbase"
SERVICE_NAME="otlist"

# Where the script fetches its own updates from
REPO_RAW_URL="https://raw.githubusercontent.com/aliaafee/ot-list"
SCRIPT_REPO_PATH="scripts/linux-deploy-release.sh"

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
    echo "  --version VERSION   Specify release version to install (default: $DEFAULT_VERSION)"
    echo "  --from-source       Build and install from Git repository instead of downloading release"
    echo "  --branch BRANCH     Specify branch to build from when using --from-source (default: main)"
    echo "  --no-self-update    Do not check the repository for a newer copy of this script"
    echo "  --self-update       Take a newer copy without asking (for unattended runs)"
    echo ""
    echo "Self-update:"
    echo "  Every run first compares this file with $SCRIPT_REPO_PATH in the"
    echo "  repository. If they differ it says so and asks whether to replace this"
    echo "  file and re-run with the same arguments; answering no, or anything other"
    echo "  than y, carries on with the copy on disk. Nothing is replaced without an"
    echo "  answer: a non-interactive run keeps the current script unless"
    echo "  --self-update is given. The check itself is skipped when the download"
    echo "  fails, when this file is not writable, when the script is piped in rather"
    echo "  than run from a file, or with --no-self-update (OTLIST_SKIP_SELF_UPDATE=1)."
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

# Function to check the repository for a newer copy of this script
#
# A server keeps whatever copy of this script it was installed with, so a
# deployment months later can run steps the repository has since changed. This
# says so before any work starts and offers to hand over to the new script -
# nothing is replaced unless the answer is yes, because running code that was
# fetched seconds ago, as root, should be a decision rather than a side effect.
#
# Every failure path here is non-fatal: an unreachable network, an unwritable
# script or a garbled download all fall through to running the copy already on
# disk, because refusing to deploy is worse than deploying from a known script.
self_update() {
    # The restarted run must not check again, or the script would loop.
    if [ "${OTLIST_SKIP_SELF_UPDATE:-0}" = "1" ]; then
        return 0
    fi

    local script_path=""
    script_path="$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null)" || true
    if [ -z "$script_path" ] || [ ! -f "$script_path" ]; then
        echo "[*] Skipping self-update: not running from a file on disk"
        return 0
    fi

    # Follow --branch, so deploying from a branch also takes that branch's
    # script rather than main's.
    local branch="main"
    local previous=""
    local argument
    for argument in "$@"; do
        if [ "$previous" = "--branch" ]; then
            branch="$argument"
        fi
        previous="$argument"
    done

    local url="$REPO_RAW_URL/$branch/$SCRIPT_REPO_PATH"
    local tmpfile=""
    tmpfile="$(mktemp)" || return 0

    echo "[*] Checking for a newer deploy script ($branch)..."
    if ! curl -fsSL "$url" -o "$tmpfile"; then
        echo "    Could not download $url"
        echo "    Continuing with the copy already on disk"
        rm -f "$tmpfile"
        return 0
    fi

    # A proxy error page or a half-written file would be a worse script than
    # the one already here, so take it only if it reads like this script and
    # parses as bash.
    if [ ! -s "$tmpfile" ] || ! head -n 1 "$tmpfile" | grep -q "^#!/bin/bash"; then
        echo "    Downloaded file is not a shell script, ignoring it"
        rm -f "$tmpfile"
        return 0
    fi
    if ! bash -n "$tmpfile" 2>/dev/null; then
        echo "    Downloaded script has syntax errors, ignoring it"
        rm -f "$tmpfile"
        return 0
    fi

    if cmp -s "$tmpfile" "$script_path"; then
        echo "    Already the current version"
        rm -f "$tmpfile"
        return 0
    fi

    # From here the two copies differ, so say what was found before asking.
    local changed=""
    if command -v diff >/dev/null 2>&1; then
        changed="$(diff "$script_path" "$tmpfile" | grep -c "^[<>]" || true)"
    fi

    echo ""
    echo "================================================================"
    echo " A newer deploy script is available"
    echo ""
    echo "   this copy: $script_path"
    echo "   repository: $url"
    if [ -n "$changed" ] && [ "$changed" != "0" ]; then
        echo "   difference: $changed line(s)"
    fi
    echo "================================================================"
    echo ""

    if [ ! -w "$script_path" ]; then
        echo "[*] $script_path is not writable, so it cannot be replaced"
        echo "    Continuing with the copy already on disk"
        rm -f "$tmpfile"
        return 0
    fi

    local answer="n"
    if [ "${OTLIST_ALWAYS_SELF_UPDATE:-0}" = "1" ]; then
        answer="y"
        echo "[*] --self-update was given, taking the newer script"
    elif [ -t 0 ]; then
        read -r -p "Replace this script with the newer one and re-run? (y/N): " answer
    else
        echo "[*] Not running interactively, so there is nothing to answer"
        echo "    Continuing with the copy already on disk"
        echo "    Pass --self-update to take the newer script automatically"
    fi

    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        echo "[*] Keeping the current script"
        echo ""
        rm -f "$tmpfile"
        return 0
    fi

    echo "[*] Replacing this script and restarting..."
    # Copy the contents rather than moving the file over it: this keeps the
    # inode, owner and mode. Bash reads a script as it runs, so rewriting it
    # mid-run is only safe because this whole function is already parsed and
    # the exec below leaves nothing further to read.
    cat "$tmpfile" > "$script_path"
    rm -f "$tmpfile"
    export OTLIST_SKIP_SELF_UPDATE=1
    exec bash "$script_path" "$@"
}

# Function to detect an existing installation
is_installed() {
    # Existing systemd unit
    if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
        INSTALL_EVIDENCE="systemd service file /etc/systemd/system/$SERVICE_NAME.service"
        return 0
    fi

    # Existing PocketBase binary
    if [ -f "$PB_DIR/pocketbase" ]; then
        INSTALL_EVIDENCE="PocketBase binary $PB_DIR/pocketbase"
        return 0
    fi

    # Existing database
    if [ -d "$PB_DIR/pb_data" ]; then
        INSTALL_EVIDENCE="PocketBase data directory $PB_DIR/pb_data"
        return 0
    fi

    # Non-empty install directory
    if [ -d "$ROOT_DIR" ] && [ -n "$(ls -A "$ROOT_DIR" 2>/dev/null)" ]; then
        INSTALL_EVIDENCE="non-empty install directory $ROOT_DIR"
        return 0
    fi

    return 1
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

    # Copy pb_hooks directory
    if [ -d "pb/pb_hooks" ]; then
        mkdir -p "$ROOT_DIR/pb/pb_hooks"
        if [ "$(ls -A pb/pb_hooks)" ]; then
            cp -r pb/pb_hooks/. "$ROOT_DIR/pb/pb_hooks/"
            echo "  ✓ Copied pb/pb_hooks/"
        else
            echo "  ✗ Warning: pb/pb_hooks/ directory is empty"
        fi
    else
        echo "  ✗ Warning: pb/pb_hooks/ directory not found"
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
    VERSION="$DEFAULT_VERSION"
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

    # Abort if OT List is already installed
    INSTALL_EVIDENCE=""
    if is_installed; then
        echo "Error: OT List appears to be already installed"
        echo "       Found: $INSTALL_EVIDENCE"
        echo ""
        echo "Nothing was changed. If you want to:"
        echo "  - move to a different version, run: $0 update --version <VERSION>"
        echo "  - rebuild from source,          run: $0 update --from-source"
        echo "  - start over from scratch,      run: $0 uninstall  (then install again)"
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
    VERSION="$DEFAULT_VERSION"
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

# The self-update flags are handled here rather than by the per-command
# parsers, so they can be given anywhere and never reach them as an unknown
# option.
SELF_UPDATE_ARGS=()
for argument in "$@"; do
    case "$argument" in
        --no-self-update)
            OTLIST_SKIP_SELF_UPDATE=1
            ;;
        --self-update)
            OTLIST_ALWAYS_SELF_UPDATE=1
            ;;
        *)
            SELF_UPDATE_ARGS+=("$argument")
            ;;
    esac
done
set -- ${SELF_UPDATE_ARGS[@]+"${SELF_UPDATE_ARGS[@]}"}
export OTLIST_SKIP_SELF_UPDATE="${OTLIST_SKIP_SELF_UPDATE:-0}"
export OTLIST_ALWAYS_SELF_UPDATE="${OTLIST_ALWAYS_SELF_UPDATE:-0}"

if [ $# -eq 0 ]; then
    usage
fi

self_update "$@"

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