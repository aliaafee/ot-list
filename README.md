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

## Procedure catalogue

Procedures are coded against the NSPC catalogue rather than typed as free
text. `procedures.procedure` no longer exists: a procedure's name lives on
its `procedureCodes` row, either as the concept picked from the catalogue
or, when nothing fits, as free text stored against the `NSX-00000`
"uncoded" sentinel.

See `specs/procedure_coding_system/` for the vocabulary design and its
governance rules. **The catalogue has a custodian; concepts are minted by
request, not by whoever needs one today.** The steps below are the
mechanics once a concept has been agreed.

### Adding a new procedure code

The CSVs under `specs/procedure_coding_system/` are the source of truth.
Everything else - the migration, the client's bundled snapshot - is
generated from them and must not be edited by hand.

1. **Add the concept** to `seed_procedures.csv`.

    Take the next free `concept_id` (`NSX-00128` at the time of writing).
    Identifiers are permanent and opaque: never renumber or reuse one.
    The FSN ends in `(procedure)`, and `subspecialty` must be a value the
    file already uses, or a new one - the release migration widens the
    column to match.

    Do **not** mint separate concepts for laterality, spinal level or
    revision. Those are post-coordination, recorded per case, which is
    why there is one `Carpal tunnel decompression` and not a left and a
    right one. `level_applicable` and `level_kind` must agree: a concept
    that takes a level says which vocabulary it draws from, and one that
    does not must leave both empty.

2. **Add synonyms** to `seed_synonyms.csv` - this is what makes the
   concept findable. Department jargon and abbreviations belong here
   (`DSA`, `ACDF`, `TFESI`), not in the formal name. A concept nobody can
   search for is a concept nobody will use.

3. **Add facet values** to `seed_facet_values.csv` only if the method,
   site, approach, device or morphology you need does not already exist.
   Reuse first: the vocabulary is small on purpose, and every value added
   is one more the custodian has to keep distinct.

4. **Publish it as a release.** The bootstrap migration
   (`1786089600_procedure_coding_system.js`) creates the collections and
   can only run once, so a change goes out as its own new migration:

    ```bash
    node scripts/build-catalogue-seed.mjs --release 1786500000_catalogue_v2026_2
    ```

    Use a unix timestamp ahead of the existing migrations. This writes the
    release migration plus `src/data/nspc-catalogue.json`, the snapshot
    the client starts from so type-ahead works before the first fetch
    returns. The script validates every facet reference and stops on a
    broken one, so a bad row fails the build rather than a live database.

5. **Apply it.**

    ```bash
    cd pb && ./pocketbase migrate up
    ```

    Note that `pocketbase serve` also applies pending migrations on
    startup - starting the server is enough to run them.

6. **Rebuild the client** (`npm run build`) so the bundled snapshot ships
   with the new concept.

### Retiring a procedure code

A code that turns out to be wrong, duplicated or obsolete is retired, not
deleted and not edited into meaning something else - identifiers are
permanent, and every operative note already coded against one has to keep
resolving.

Retiring changes the concept's **existing** row in `seed_procedures.csv`;
it never adds a second one. On that row set:

- `active` to `0`,
- `inactivation_reason` to one of `duplicate`, `ambiguous`, `erroneous`,
  `outdated`,
- `replaced_by` to the successor's `concept_id`, if there is one - mint
  it first, in the same release, or the build will reject the reference,
- `effective_to` to the date it stops being offered,
- `catalogue_release` to the release doing the retiring.

Leave everything else alone: the name, facets and flags are what the code
meant, and historical records are rendered with them.

The **Procedure codes** page in the app (Browse → pick a code → "Retire
this code…") produces exactly these columns as
`retire_procedures.<date>.csv`, which is a list of edits to apply to rows
that already exist - unlike the `seed_*.csv` files it downloads beside
it, it is not a file to append.

Then publish, apply and rebuild as in steps 4-6 above. The pickers stop
offering the code as soon as the release lands; anything already coded
against it still resolves and still renders.

### Notes

- **The release payload is the whole catalogue, not a delta.** Every row
  upserts on its business identifier, so applying a release twice changes
  nothing, and a database several releases behind converges in one step.

- **Reverting a release is a deliberate no-op.** Deleting concepts would
  orphan every procedure already coded against them. A concept that turns
  out to be wrong is retired in place - set `active` to `0` and point
  `replaced_by` at its successor - so historical records still resolve.
  Roll forward with a corrective release.

- **Never edit an applied migration.** It will not re-run, so the repo
  moves and the database does not. The build script reads the local
  `_migrations` table and refuses, telling you the `--release` command to
  use instead.

### Finding what needs coding

Procedures recorded as free text sit against `NSX-00000`, so the coding
backlog is a query rather than a guess:

```
procedureCodes, filter: concept.conceptId = "NSX-00000"
```

`needsReview` narrows that to the ones typed since coding began, as
distinct from the historical records the bootstrap migration carried over.
Reviewing that list is how the catalogue learns what it is missing.
