# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

OT List is an operating-theatre scheduling app for a neurosurgery department. Staff
book patients onto operating lists by day and room, code each procedure against a
local procedure catalogue (NSPC), and work through a pre-op checklist generated
from that coding.

- **Client**: React 19 + React Router 7, Vite 8, Tailwind CSS 4. Plain JavaScript
  (`.jsx`/`.js`), no TypeScript.
- **Backend**: PocketBase (SQLite). The binary is not in the repo; it sits in
  `pb/` and serves both the API and the built client from `dist/`.
- **Server logic**: JavaScript hooks in `pb/pb_hooks/`, run inside PocketBase's
  embedded Go JS runtime (not Node, not a browser).

## Commands

```bash
npm install
npm run dev        # Vite on :5173, proxies /api and /_ to 127.0.0.1:8090
npm run pb:serve   # PocketBase on :8090, serving ./dist; applies pending migrations on start
npm run build      # client bundle into ./dist
npm run lint       # ESLint over client, hooks, scripts, tests and mcp
npm test           # unit tests (client + hooks); no PocketBase needed
npm run test:watch
npm run release    # build + zip into releases/ot-list-v<version>.zip
npm run codes -- list | new <ver> | publish <ver> [--dry-run] [--stamp]
```

Both `dev` and `pb:serve` must be running for local work. PocketBase must be
downloaded separately and extracted into `pb/` (`pb/pocketbase.exe` on Windows).

Verification is `npm test`, `npm run lint`, `npm run build`, and, for anything
the unit tests cannot see, exercising the change against a running PocketBase.
See [Testing](#testing). `npm run lint` currently reports existing errors in
`src/`; a change should add none.

`.env` holds only `VITE_PB_BASE_URL`, and it is read in dev builds only. A
production build always talks to its own origin.

## Layout

| Path | What |
|---|---|
| `src/` | The React client. `@/` aliases `src/`. |
| `pb/pb_hooks/` | Server hooks and custom API routes. |
| `pb/pb_migrations/` | Schema and seed migrations. Append-only history. |
| `specs/` | Design specs. **Read the relevant one before touching that feature.** |
| `scripts/` | Catalogue release manager, release zipper, deploy scripts (systemd, Ansible, Windows). |
| `tests/` | Unit tests: `client/` mirrors `src/`, `hooks/` covers `pb/pb_hooks`. |
| `mcp/` | Standalone MCP server exposing OT List data read-only. Own `package.json`. |
| `src/data/` | Bundled catalogue copy. **Generated** by `npm run codes -- publish`. |

### Specs are the source of truth

- [specs/procedure_codes/README.md](specs/procedure_codes/README.md): catalogue
  storage, versioning, picker, search, write and read paths.
  [neurosurgery-coding-system-spec.md](specs/procedure_codes/neurosurgery-coding-system-spec.md)
  beside it holds the clinical reasoning.
- [specs/checklists/README.md](specs/checklists/README.md): checklist templates,
  assembly, reconciliation, the rebuild rules and every decision behind them.
- [README.md](README.md): catalogue release workflow, the time zone rule, deployment.

Each spec ends with an invariants section and a file index. When behaviour
changes, update the spec in the same change.

## Data model

```
departments ─ otLists ─ otDays (one list on one date)
                 └ operatingRooms
procedures → procedureDay (otDay), operatingRoom, patient
   ├ procedureCodes → procedureConcepts, spinalLevels
   ├ procedureChecklistItems
   ├ procedureComments
   └ procedurePacStatuses
```

Catalogue tables: `procedureConcepts`, `procedureFacetValues`,
`procedureConceptSynonyms`, `spinalLevels`, `catalogueRevisions`.
Checklist authoring: `checklistTemplates`, `checklistTemplateItems`.
Also `surgeons`, `users`, `appSettings` (a single record, id `appsettings0001`),
and the SQL views `upcomingOtDays` and `activeSurgeons`.

Roles are `admin`, `doctor`, `receptionist`. Doctors and admins edit;
receptionists read (and may add PAC statuses and comments).

`pb_schema.json` is an **old export** and lacks every collection added since
(codes, catalogue, checklists, app settings). The migrations are the real schema.

## Client architecture

Provider order in [src/main.jsx](src/main.jsx): `ErrorBoundary` → `BrowserRouter` →
`AuthProvider` → `CatalogueProvider` → `ProcedureListProvider` → `App`.
`StrictMode` is deliberately off: double mounting breaks PocketBase subscriptions.

- `src/pages/`: route components. Routes are in [src/app.jsx](src/app.jsx).
- `src/components/`: shared UI. `procedure-item/` is one procedure row in its
  collapsed, expanded and editing forms, plus its checklist and comments.
- `src/dashboard/`: settings pages. Each default-exports
  `{ title, icon, adminOnly?, content, detail? }` and is registered by one line in
  `sidebarPages` in [src/pages/settings-dashboard.jsx](src/pages/settings-dashboard.jsx).
  The comment there explains the `detail` shape; `dashboard/checklists/` is the example.
- `src/contexts/`, `src/reducers/`: the open day's procedures live in
  `procedure-list-context.jsx` with a reducer, optimistic updates and temporary ids
  (`tempid-…`), kept live by subscriptions.
- `src/lib/`: [pb.js](src/lib/pb.js) (the `pb` client, and `pbAdmin`, an
  in-memory-only superuser client for `/admin/backups`), [api.js](src/lib/api.js)
  (one wrapper per custom route), catalogue sourcing and search, shared vocabularies.
- `src/modals/`, `src/forms/`, `src/utils/`.

## Server architecture

PocketBase loads only `pb/pb_hooks/*.pb.js`. Plain `.js` files there are CommonJS
modules of shared code.

**A hook handler runs in its own scope** and cannot see anything defined at the top
of its file. Shared code must be loaded inside the handler:

```js
const { syncProcedureCodes } = require(`${__hooks}/procedure-codes.js`);
```

| File | Role |
|---|---|
| `transactions.pb.js` | All custom write routes, each inside `runInTransaction`. |
| `procedure-codes.js` | `syncProcedureCodes` (delete and recreate), `PROCEDURE_EXPAND`, report rendering. |
| `procedure-checklists.js` | `assembleChecklist` (pure), reconciliation, `syncProcedureChecklist`. |
| `checklist-templates-io.js` | Template export and import. |
| `checklist-validation.pb.js` | Refuses template item keys starting `custom-`. |
| `auto_tracking.pb.js` | Stamps `creator`/`updater` on collection API writes. |
| `reports.pb.js`, `reports.js`, `templates/` | The printable list, `GET /api/lists/{otDayId}/html`. |
| `app-settings.js` | `todayDate(app)`. |

Routes: `add-procedure-with-patient`, `bulk-update-procedures`, `add-pac-status`,
`ot-days/bulk-create`, `update-patient`, `set-checklist-item`, `add-checklist-item`,
`remove-checklist-item`, `rebuild-checklist`, `preview-checklist`,
`export-checklist-templates`, `import-checklist-templates` (all under `/api/`).

**Writes go through routes, not the collection API.** Direct create and update on
`procedures`, update on `patients`, and all writes to `procedureChecklistItems`
are closed by rule (`null`). A new write path means a route in `transactions.pb.js`
with a role check, plus a wrapper in `src/lib/api.js`. Inside a transaction use
`txApp`, never `$app`.

`pb/pb_hooks_testing/` is not loaded by anything and is not in the release zip.
It holds older copies of the hooks; do not edit it expecting an effect.

## Testing

**Framework: Vitest**, configured in `vitest.config.js` on top of `vite.config.js`,
so the `@/` alias and JSX resolve in a test as they do in the client. Each layer
is a Vitest project; run one with `npx vitest run --project hooks`, or one file
with `npx vitest run tests/client/lib/checklists.test.js`.

Layers 1 and 2 are in place. Layer 3 is still a plan.

The whole run uses `TZ=America/Los_Angeles`, set in `vitest.config.js`: a zone
behind UTC and far from the hospital's, so code that reads a stored date through
the local clock gets the day before and fails. Do not remove it to make a date
test pass; fix the read.

### Layer 1: client unit tests

Pure functions in `src/lib` and `src/utils`, in the `node` environment. Tests live
in `tests/client/`, mirroring `src/` (`tests/client/lib/procedure-catalogue.test.js`),
and import the source through `@/`. No test files go in `src/`.

Covered so far: `lib/procedure-catalogue.js`, `lib/procedure-codes.js`,
`lib/checklists.js`, the date helpers in `utils/dates.jsx`, `utils/ot-days.jsx`
and `lib/app-settings.js`, and `utils/text-parsers.jsx`.

Tests of "today" set the shared settings with `setAppSettings` and freeze the
clock with `vi.useFakeTimers`; see `tests/client/utils/dates.test.js`.

### Layer 2: hook unit tests

The pure functions in `pb/pb_hooks/*.js`. Covered so far: `assembleChecklist`,
`ageInMonths`, `datePart` and `customItemKey` in `procedure-checklists.js`, and
import validation and writing in `checklist-templates-io.js`.

Hook modules are CommonJS scripts for PocketBase's runtime, while the repo is
`"type": "module"`, so they cannot be imported directly. Tests load them with
`loadHook("procedure-checklists.js")` from `tests/hooks/load-hook.js`, which
evaluates the file with a `module`, a `require` that resolves `${__hooks}/…`, and
the PocketBase error classes. Other globals (`Record`, `$app`) are passed in by
the test that needs them.
**Do not change a hook file's module format to suit the test runner**: PocketBase
is the runtime that matters.

`tests/hooks/fake-app.js` has a minimal stand-in app and record for code that
reads a few rows around the logic under test. It has no filters, rules or
transactions on purpose: anything that depends on those belongs in layer 3, not
in a cleverer fake.

Tests live in `tests/hooks/`, not in `pb/pb_hooks/`, because that whole directory
is zipped into the release.

### Layer 3: integration tests against PocketBase (proposed, not yet set up)

For what the unit layers cannot see: migrations, collection rules, role checks,
transactions and reconciliation against real records. A global setup starts
`pb/pocketbase` on a spare port with a temporary `--dir`, pointing at the real
`pb_migrations` and `pb_hooks`, creates a superuser and one user per role, and
deletes the directory afterwards. Tests then call the routes with the `pocketbase`
JS client. They never touch `pb/pb_data`.

First targets: the checklist write path end to end (tick preservation across a
code change, the three patient edits of spec §5, the past-procedure refusals), and
that closed collections reject direct writes.

Tests will live in `tests/pb/` and run with `npm run test:pb`. This layer needs
the PocketBase binary, so it is a separate script and is skipped with a clear
message when the binary is missing.

### Not planned yet

Component tests (jsdom + Testing Library) and browser end-to-end tests. Most
logic worth testing is already in pure functions or in the hooks; add these only
when a bug shows a gap the three layers cannot cover.

### Conventions

- A bug fix comes with a test that fails without it.
- Test names state the rule, with the spec section where there is one:
  `"an unknown age fails every age criterion (§3.1)"`.
- Fixtures are small literals built in the test. No shared database snapshot and
  no dependence on seeded templates. The one exception is the spinal-level
  vocabulary (`src/data/spinal-levels.json`), which tests may import; concepts are
  built in the test so a catalogue release cannot change what a test asserts.
- Test files import `describe`, `it` and `expect` from `vitest`; there are no
  test globals.
- `npm test` must pass before a commit; `npm run test:pb`, once it exists, before
  a release.

## Rules that are easy to break

**Time.** "Today" is the hospital's date, from `appSettings.utcOffsetMinutes`.
Never use `new Date()`, a bare `dayjs()` or SQLite `DATE('now')` to decide what day
it is or to display a stored value.

- Server: `todayDate(app)`. Client: `hospitalToday()` in `src/lib/app-settings.js`.
- Calendar dates (OT day, date of birth) are stored at UTC midnight: read with
  `calendarDate` / `formatDate` from [src/utils/dates.jsx](src/utils/dates.jsx),
  which take the date part and never convert.
- Timestamps (created, ticked at): read with `hospitalTime` / `formatDateTime`.

**Migrations.** `pb/pb_migrations` is append-only and excluded from lint. Do not
edit a migration that may have reached a real database; add a new one. Seed
migrations named `*_seeded_procedureCodes_*` are generated: change the spec files
under `specs/procedure_codes/<version>/` and publish instead.

**Catalogue.** Concept ids (`NSX-00042`) and facet value ids are permanent and never
reused. Nothing is deleted from a release; retire with `active: false`.
`NSX-00000` is the "uncoded" sentinel that carries free text. Sort spinal levels by
`ordinal`, never by code string.

**Snapshots.** `displayTerm`, `spinalLevelsSnapshot` and `catalogueRelease` on
`procedureCodes`, and `label`, `hint` and `required` on `procedureChecklistItems`,
record what was true when written. Do not "fix" them to follow the live catalogue
or template.

**Checklists.**
- Assembly is one pure function shared by the write paths and the preview route.
  Do not add a client-side copy or a preview-only branch.
- Reconciliation preserves staff input: a ticked or commented item is never
  deleted, only marked `applicable = false`. Custom items are never touched.
- Rebuild triggers are exactly: a procedure's codes, day or patient changed, and a
  patient's date of birth or sex **first entered**. A correction to a recorded
  value deliberately does not rebuild. Past procedures are not rebuilt by patient
  edits or by the rebuild route.
- `itemKey` is an item's identity across templates and rebuilds.

**Realtime subscriptions.** When a component subscribes per record (checklist,
comments, PAC status), pass the filter to `subscribe` itself, not only to the fetch:

```js
pb.collection("procedureChecklistItems").subscribe("*", handler, { filter });
```

Without it, two instances share a subscription key and the newly mounted one never
receives events. Always unsubscribe in the effect cleanup.

**Expand strings.** The procedure expand
(`…procedureCodes_via_procedure.concept,procedureCodes_via_procedure.spinalLevels`)
is repeated in `procedure-list-context.jsx`, `pages/all-procedures.jsx`,
`pages/patients.jsx` and `PROCEDURE_EXPAND` in the hook. Change them together.
The checklist is fetched per expanded procedure and must stay out of these.

**Editing codes.** Never resolve stored codes against an unloaded catalogue and
save; that deletes them. `procedure-item/editor.jsx` guards this.

## Conventions

- Prettier: 4-space indent. Double quotes and semicolons in current code.
- File names are kebab-case; components are default exports.
- Import through `@/`. Merge conditional classes with `twMerge`.
- ESLint has three environments (browser for `src/`, PocketBase globals for
  `pb/`, Node for `scripts/`, `mcp/` and config files). Hooks are scripts, not ES
  modules. Unused args opt out with a leading `_`.
- Comments explain why a rule exists, usually with a spec section reference
  (`§7`). Keep that style and keep them accurate when the code changes.
- `.github/copilot-instructions.md` predates the catalogue and checklists and is
  partly out of date; prefer this file and the specs.
