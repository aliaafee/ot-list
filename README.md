# OT List

## Installation

- npm install
- download https://github.com/pocketbase/pocketbase/releases
- extract pocketbase binary to ./pb/
- npm run dev
- npm run pb:serve

## Deploy

### Linux host

Use the deploy script or followind instructions

1. **Create application directory**

   ```bash
   sudo mkdir -p /opt/react-pocketbase
   ```

2. **Create dedicated user**

   ```bash
   sudo useradd -r -s /usr/sbin/nologin -d /opt/react-pocketbase pocketbase
   ```

   _(Run only if the user does not already exist.)_

3. **Install prerequisites**

   ```bash
   sudo apt update
   sudo apt install -y git curl unzip
   ```

4. **Install Node.js v22 (via NVM)**

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   . "$HOME/.nvm/nvm.sh"
   nvm install 22
   ```

5. **Fix directory permissions**

   ```bash
   sudo chown -R pocketbase:pocketbase /opt/react-pocketbase
   ```

6. **Clone repository**

   ```bash
   sudo -u pocketbase git clone https://github.com/aliaafee/react-pocketbase.git /opt/react-pocketbase
   ```

7. **Install npm dependencies**

   ```bash
   cd /opt/react-pocketbase
   npm install
   ```

8. **Download latest PocketBase binary**

   ```bash
   sudo -u pocketbase curl -L "$LATEST_URL" -o /opt/react-pocketbase/pb/download.zip
   sudo -u pocketbase unzip -o /opt/react-pocketbase/pb/download.zip -d /opt/react-pocketbase/pb
   rm /opt/react-pocketbase/pb/download.zip
   ```

9. **Build frontend**

   ```bash
   npm run build
   ```

10. **Install systemd service**

    ```bash
    sudo cp /opt/react-pocketbase/scripts/pocketbase.service /etc/systemd/system/pocketbase.service
    ```

    _(Ensure the `pocketbase.service` file exists in the `scripts/` directory.)_

11. **Reload systemd and enable service**

    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable pocketbase.service
    sudo systemctl start pocketbase.service
    ```
