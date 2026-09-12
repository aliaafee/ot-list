# OT List

## Installation

-   npm install
-   download https://github.com/pocketbase/pocketbase/releases
-   extract pocketbase binary to ./pb/
-   npm run dev
-   npm run pb:serve

## Procedure codes

Procedure codes are versioned catalogue releases. Each release is a folder under
`specs/procedure_codes` (`v2026.1`, `v2026.2`, ...) holding three files:

-   `nspc-catalogue.json` — the procedure concepts
-   `facet-values.json` — the controlled vocabulary the concepts' facets are drawn from
-   `spinal-levels.json` — the vertebrae and interspaces concepts can be qualified with

A release is a **complete copy** of the previous one plus that release's changes.
Changes are only ever additive:

-   **Nothing is deleted.** A code that should no longer be used is marked
    `"active": false` with an `inactivationReason`. It disappears from the picker
    but stays in the database, so procedures already recorded against it keep
    reading correctly.
-   **A conceptId is permanent.** Never repurpose one. If the meaning of a code
    changes, retire the old code and add a new one.
-   **Retirement is one way.** A code retired in an earlier release cannot be made
    active again.
-   **Replacements are recorded.** When a new code takes over from a retired one,
    name the new code in the old code's `replacedBy`.
-   **Every code you touch is stamped** with `"catalogueRelease": "<version>"`, so
    the database says which release last changed each code.
-   **Facet values are retired, not deleted**, for the same reason concepts are:
    a concept points at one by id.

### How a concept is stored

A concept's facets are not text on the concept. Each one points at a row in
`procedureFacetValues`, so a term like `Drainage` is defined once and shared by
every concept that uses it — which means it can be mapped to SNOMED CT once,
rather than per concept. `facet-values.json` is that vocabulary:

```json
{
    "facetValueId": "MTH-0007",
    "facet": "method",
    "term": "Drainage",
    "snomedAttribute": "Method",
    "active": true,
    "effectiveFrom": "2026-08-07"
}
```

The catalogue names facets by **term**, and publish resolves each to its facet
value. A term that is not in the vocabulary is an error, which is what keeps
the facets a controlled vocabulary instead of free text — so **add the term to
`facet-values.json` first**, with the next id for its facet.

The six facets map to the concept's relations as `method`, `procedureSite`,
`surgicalApproach`, `device`, `morphology` and `defaultIntent` (the concept's
default intent, which a coded procedure may override).

Synonyms are stored the same way — one `procedureConceptSynonyms` row each,
rather than a json array — because search reads across them. They cascade with
their concept.

Both are flattened back on read, so the client sees a concept with a plain
`facets` object and `synonyms` array whether it came from the database, the
cache, or the bundled snapshot.

`facetValueId` and `conceptId` are permanent: ids live in the spec files and
are assigned once, so appending a term never renumbers an existing one and a
SNOMED mapping made against it stays attached.

### Adding a new version

1. **Start the release.** This copies the latest version into a new folder:

    ```bash
    npm run codes -- new v2026.2
    ```

2. **Edit the json files** in `specs/procedure_codes/v2026.2` — append new codes,
   retire codes with `active: false` plus `inactivationReason` and `replacedBy`,
   and set `catalogueRelease` to `v2026.2` on everything you changed. If a code
   needs a facet term the catalogue has not used before, add it to
   `facet-values.json` first with the next id for its facet.

3. **Check what the release will do** before writing anything:

    ```bash
    npm run codes -- publish v2026.2 --dry-run
    ```

4. **Publish it:**

    ```bash
    npm run codes -- publish v2026.2 --stamp
    ```

    `--stamp` sets `catalogueRelease` on the changed codes for you; drop it if you
    stamped them by hand.

5. **Ship it.** Rebuild the client and restart PocketBase so the migration applies:

    ```bash
    npm run build
    npm run pb:serve
    ```

### What publish does

It first validates the release against its predecessor, and refuses to write
anything if a code or facet value was deleted, a retired code was reactivated, a
`replacedBy` points nowhere or loops, ids are duplicated, or a concept names a
facet term the vocabulary does not have. When it passes, it writes:

-   `pb/pb_migrations/<timestamp>_seeded_procedureCodes_v2026_2.js` — a migration
    that seeds **only the changed records**: changed facet values first, then
    levels, then concepts, since a concept points at its facet values. Each entry
    also carries the record's previous values, so `pocketbase migrate down`
    restores the earlier release exactly.
-   `src/data/nspc-catalogue.json`, `src/data/spinal-levels.json` and
    `src/data/catalogue-release.json` — the copies the client bundles at build time.
    The bundled catalogue keeps facets as terms, so it needs no vocabulary of its
    own.

Inside the migration, facets travel as `facetValueId`s and are resolved to
records when it runs. A concept's synonyms are replaced as a set, because the
catalogue always states a concept's whole synonym list.

To see every version and whether it has been published:

```bash
npm run codes -- list
```

Once a version is published its migration exists and `publish` will refuse to run
again. To regenerate it (only ever before the migration has reached a real
database), delete the migration file and publish again.

A regenerated migration gets a fresh timestamp, which puts it last. If any later
migration depends on the seeded catalogue — the one that moves legacy procedure
text onto the uncoded concept does — rename the regenerated file back to its
original timestamp, or it will run after the migration that needs it.

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
