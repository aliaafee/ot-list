# OT List

## Installation

-   npm install
-   download https://github.com/pocketbase/pocketbase/releases
-   extract pocketbase binary to ./pb/
-   npm run dev
-   npm run pb:serve

## Deploy

### Linux host

#### Automated Deployment (Recommended)

Use the automated deployment script to install or uninstall OT List from a GitHub release.

**Installation:**

Download and run the installation script:

```bash
curl -L https://raw.githubusercontent.com/aliaafee/ot-list/main/scripts/linux-deploy-release.sh -o linux-deploy-release.sh
chmod +x linux-deploy-release.sh
sudo ./linux-deploy-release.sh install [VERSION]
```

Examples:

```bash
sudo ./linux-deploy-release.sh install 0.0.2    # Install specific version
sudo ./linux-deploy-release.sh install          # Install default version (0.0.1)
```

**What the installation does:**

-   Creates `/opt/ot-list` directory
-   Creates dedicated `pocketbase` user
-   Downloads the release zip from GitHub
-   Downloads and installs PocketBase binary
-   Applies database migrations
-   Optionally creates an admin user (you'll be prompted)
-   Sets up systemd service named `otlist`
-   Starts the service automatically

**Uninstallation:**

To completely remove OT List from your system:

```bash
sudo ./linux-deploy-release.sh uninstall
```

The uninstall process will:

-   Stop and disable the `otlist` service
-   Remove the systemd service file
-   Move `/opt/ot-list` to a backup directory (e.g., `/opt/ot-list.old.1732800000`)
-   Remove the `pocketbase` user
-   Require confirmation before proceeding

**Note:** Your data is preserved in the backup directory and can be manually deleted later.

**After installation:**

```bash
# Check service status
sudo systemctl status otlist

# Follow logs
sudo journalctl -u otlist -f

# Restart service
sudo systemctl restart otlist
```

The application will be accessible at `http://your-server:8090`.

**Creating admin users:**

If you skipped admin user creation during installation, you can create one later:

```bash
sudo -u pocketbase /opt/ot-list/pb/pocketbase superuser create <email> <password>
```

#### Manual Deployment

Follow these instructions if you prefer manual installation from a release:

1. **Install prerequisites**

    ```bash
    sudo apt update
    sudo apt install -y curl unzip systemd
    ```

2. **Create dedicated user**

    ```bash
    sudo useradd -r -s /usr/sbin/nologin -d /opt/ot-list pocketbase
    ```

    _(Run only if the user does not already exist.)_

3. **Create application directory**

    ```bash
    sudo mkdir -p /opt/ot-list
    cd /opt/ot-list
    ```

4. **Download and extract release**

    Replace `<VERSION>` with the desired version (e.g., `0.0.1`):

    ```bash
    VERSION="<VERSION>"
    RELEASE_URL="https://github.com/aliaafee/ot-list/releases/download/v${VERSION}/ot-list-v${VERSION}.zip"
    curl -L "$RELEASE_URL" -o ot-list-release.zip
    unzip -o ot-list-release.zip -d /opt/ot-list
    rm ot-list-release.zip
    ```

5. **Download PocketBase binary**

    ```bash
    sudo mkdir -p /opt/ot-list/pb
    LATEST_URL=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
        | grep "browser_download_url.*linux_amd64.zip" \
        | cut -d '"' -f 4 | head -n1)
    curl -L "$LATEST_URL" -o /opt/ot-list/pb/pocketbase.zip
    unzip -o /opt/ot-list/pb/pocketbase.zip -d /opt/ot-list/pb
    rm /opt/ot-list/pb/pocketbase.zip
    sudo chmod +x /opt/ot-list/pb/pocketbase
    ```

6. **Set ownership**

    ```bash
    sudo chown -R pocketbase:pocketbase /opt/ot-list
    ```

7. **Install systemd service**

    ```bash
    sudo cp /opt/ot-list/scripts/pocketbase.service /etc/systemd/system/otlist.service
    ```

8. **Enable and start service**

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable otlist.service
    sudo systemctl restart otlist.service
    ```

9. **Check service status**

    ```bash
    sudo systemctl status otlist

    # Get admin token from first-time setup
    sudo systemctl --full --no-pager status otlist | grep -A 1 "superuser account:"
    ```

#### Manual Deployment (Build from Source)

For development or custom builds:

1. **Install prerequisites**

    ```bash
    sudo apt update
    sudo apt install -y git curl unzip
    ```

2. **Install Node.js v22 (via NVM)**

    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    . "$HOME/.nvm/nvm.sh"
    nvm install 22
    ```

3. **Create dedicated user**

    ```bash
    sudo useradd -r -s /usr/sbin/nologin -d /opt/ot-list pocketbase
    ```

4. **Create application directory**

    ```bash
    sudo mkdir -p /opt/ot-list
    ```

5. **Clone repository**

    ```bash
    sudo -u pocketbase git clone https://github.com/aliaafee/ot-list.git /opt/ot-list
    cd /opt/ot-list
    ```

6. **Install npm dependencies**

    ```bash
    npm install
    ```

7. **Build frontend**

    ```bash
    npm run build
    ```

    **Optional: Specify custom backend URL**

    Create a `.env` file in project root:

    ```
    VITE_PB_BASE_URL="site.domain.com:port"
    ```

8. **Download PocketBase binary**

    ```bash
    sudo mkdir -p /opt/ot-list/pb
    LATEST_URL=$(curl -s https://api.github.com/repos/pocketbase/pocketbase/releases/latest \
        | grep "browser_download_url.*linux_amd64.zip" \
        | cut -d '"' -f 4 | head -n1)
    curl -L "$LATEST_URL" -o /opt/ot-list/pb/pocketbase.zip
    unzip -o /opt/ot-list/pb/pocketbase.zip -d /opt/ot-list/pb
    rm /opt/ot-list/pb/pocketbase.zip
    sudo chmod +x /opt/ot-list/pb/pocketbase
    ```

9. **Set ownership**

    ```bash
    sudo chown -R pocketbase:pocketbase /opt/ot-list
    ```

10. **Install systemd service**

    ```bash
    sudo cp /opt/ot-list/scripts/pocketbase.service /etc/systemd/system/otlist.service
    ```

11. **Enable and start service**

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable otlist.service
    sudo systemctl restart otlist.service
    ```

12. **Check service status**

    ```bash
    sudo systemctl status otlist
    ```
