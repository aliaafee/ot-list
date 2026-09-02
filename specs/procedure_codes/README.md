# Procedure coding system

This document describes how procedure coding is designed and wired together:
storage, client architecture, and the catalogue publish workflow.

The clinical/terminology design rationale (identifier policy, why post-coordination,
SNOMED alignment, governance) lives in the full specification, kept alongside this
file: [`neurosurgery-coding-system-spec.md`](./neurosurgery-coding-system-spec.md).

Read that for the *why*. This README is the *what* and *where*.

---

## 1. Concept in one paragraph

Operations are named from a controlled local vocabulary, the **IGMH Neurosurgery
Procedure Coding System (NSPC)**. Every catalogue entry ("concept") has an
opaque permanent id (`NSX-00042`), a fully specified name, a preferred term,
free-text searchable synonyms, and a set of **facets** (method, site, approach,
device, morphology, intent) drawn from a shared, separately-versioned
vocabulary. Anything that varies *per operation* rather than per concept —
laterality, urgency, revision status, staging, and **spinal level** — is a
**post-coordination** field recorded against the procedure, never baked into a
concept. A sentinel concept `NSX-00000` captures procedures the catalogue does
not yet cover, so "uncoded" is still a row and the coverage gap is queryable.

---

## 2. Storage (PocketBase collections)

Created by the migrations in [`pb/pb_migrations/`](../../pb/pb_migrations/):

| Collection | id | Created by | Purpose |
|---|---|---|---|
| `procedureFacetValues` | `pbc_3001000001` | [`1787734430_created_procedureConcepts.js`](../../pb/pb_migrations/1787734430_created_procedureConcepts.js) | The shared facet vocabulary. One row per controlled term. |
| `procedureConcepts` | `pbc_1509233874` | same file | The catalogue itself. Facets are **relations** into `procedureFacetValues`. |
| `procedureConceptSynonyms` | `pbc_3001000003` | same file | Per-concept search synonyms (department jargon, abbreviations, level shorthands). Cascade-deleted with the concept. |
| `spinalLevels` | `pbc_2604117395` | [`1787734431_created_spinalLevels.js`](../../pb/pb_migrations/1787734431_created_spinalLevels.js) | The spinal-level vocabulary — 27 vertebrae + 25 interspaces, `ordinal`-ordered. |
| `procedureCodes` | `pbc_3317842065` | [`1787734432_created_procedureCodes.js`](../../pb/pb_migrations/1787734432_created_procedureCodes.js) | The encounter-level join: one row per coded procedure on a `procedures` record, carrying the post-coordination fields. |

### `procedureConcepts` fields

`conceptId`, `fsn`, `preferredTerm`, `subspecialty`;
`method`, `procedureSite`, `surgicalApproach`, `device`, `morphology`,
`defaultIntent` (all relations → `procedureFacetValues`);
`lateralityApplicable`, `revisionApplicable`, `levelApplicable` (bool);
`levelKind` (`interspace` | `vertebra`); `levelRegions` (json array of region names);
`active`, `inactivationReason`, `replacedBy` (plain conceptId string — resolved by
business id, not record id); `effectiveFrom`, `catalogueRelease`.

### `procedureCodes` fields

`procedure` (relation, cascade-delete), `concept` (relation), `freeText`,
`position` (int, ordering within a procedure),
`laterality` (`left`/`right`/`bilateral`/`not-applicable`),
`revisionStatus` (`primary`/`revision`), `priority` (`elective`/`urgent`/`emergency`),
`stagedSequence` (int), `intentOverride` (text),
`spinalLevels` (relation → `spinalLevels`, `maxSelect: 52`),
`catalogueRelease` (text, stamped at write time),
`displayTerm` (text, stamped at write time — see §6).

### Access rules

- `procedureFacetValues`, `procedureConcepts`, `procedureConceptSynonyms`,
  `spinalLevels`: **read** for any signed-in user; **no** create/update/delete
  rules — the seed migration is the only writer.
- `procedureCodes`: read for any signed-in user; create/update require role
  `doctor` or `admin`; delete requires `admin`. In practice all writes go
  through the transaction hooks (§5), not direct collection calls.

---

## 3. Catalogue releases (the spec files)

Each release is a folder under this directory:

```
specs/procedure_codes/
  v2026.1/
    nspc-catalogue.json    # concepts: id, names, facets (as terms), flags, synonyms
    spinal-levels.json     # the level vocabulary
    facet-values.json      # the facet vocabulary (spec-only + used to resolve relations)
```

A release is a **full copy of the previous release plus that release's
changes**. Nothing is ever deleted: retired concepts stay in the file with
`active: false` (and `inactivationReason`, plus `replacedBy` when superseded).
`facet-values.json` never reaches the database as a file — it is how the
publisher resolves a concept's facet *terms* to facet-value *ids*, and its rows
are seeded into `procedureFacetValues`.

Current release: **v2026.1** — 129 concepts, 52 spinal levels, 165 facet values.

### Version manager — `npm run codes`

[`scripts/procedure-codes.js`](../../scripts/procedure-codes.js):

```
npm run codes list                              # releases + publish status
npm run codes -- new v2026.2 [--from v2026.1]   # start a release (copies the latest)
npm run codes -- publish [v2026.2] [--dry-run] [--stamp]
```

`publish`:

1. **Validates** the release against its predecessor — ids unique & permanent,
   nothing dropped (retire with `active: false`), `replacedBy` resolves and
   doesn't loop, retirement is one-way (`--allow-reactivate` to override),
   every facet term a concept names exists in the vocabulary,
   `levelApplicable`/`levelKind` agree, every changed concept carries
   `catalogueRelease === <this release>` (`--stamp` rewrites them).
2. **Generates a PocketBase migration** `<ts>_seeded_procedureCodes_<slug>.js`
   that seeds **only what changed** — each entry carries `prev` (null when
   added) and `next`, so the migration rolls back exactly. Facets travel as
   `facetValueId`s and are resolved to records inside the migration; synonyms
   are replaced as a whole set per concept.
3. **Copies** `nspc-catalogue.json` + `spinal-levels.json` into
   [`src/data/`](../../src/data/) and writes `catalogue-release.json`, so a
   rebuilt client bundles the same catalogue.

Then: `npm run build`, and restart PocketBase to apply the migration.

### Migration history

| Migration | Effect |
|---|---|
| `1787734430_created_procedureConcepts.js` | Creates `procedureFacetValues`, `procedureConcepts`, `procedureConceptSynonyms`. |
| `1787734431_created_spinalLevels.js` | Creates `spinalLevels`. |
| `1787734432_created_procedureCodes.js` | Creates `procedureCodes`. |
| `1787895907_seeded_procedureCodes_v2026_1.js` | Generated seed for v2026.1 (do not hand-edit). |
| `1788005752_updated_procedures.js` | `procedures.procedure` (legacy free-text field) made optional. |
| `1788009377_moved_procedureText_to_procedureCodes.js` | Backfills every procedure that has legacy free text but no codes with one uncoded `procedureCodes` row (`concept = NSX-00000`, `freeText`/`displayTerm` = the old text). Idempotent; leaves already-coded procedures alone. Down-migration removes only rows still matching the copied text. |

---

## 4. Client architecture

```
main.jsx
  └─ <CatalogueProvider>                      contexts/catalogue-context.jsx
       ├─ lib/catalogue-source.js             where the catalogue data comes from
       ├─ lib/procedure-catalogue.js          search + spinal-level logic (pure)
       └─ components/procedure-code-selector.jsx   the picker UI
            └─ used via FormField type="procedure-code"
                 └─ FormListField type="procedure-code"  (one per code, add/remove)
                      └─ forms/procedure-form.jsx  field name "procedureCodes"

lib/procedure-codes.js   translates picker values <-> API payload <-> display lines
```

### 4.1 `lib/catalogue-source.js` — data sourcing

Three interchangeable sources, in order of preference, all returning
`{ concepts, levels }` in the same shape:

1. **Database** — `procedureConcepts` (expanding the six facet relations and
   `procedureConceptSynonyms_via_concept`) + `spinalLevels`. `toConcept` /
   `toLevel` project records onto the bundled-json shape (facets flattened back
   to terms, `""` → `null`, timestamps → `YYYY-MM-DD`).
2. **`localStorage` cache** (`ot-list.catalogue`) — the catalogue is a few
   hundred KB and only changes on a release, so it is cached, guarded by:
   a **fingerprint** (record count + newest `updated` across
   `procedureConcepts`, `spinalLevels`, `procedureFacetValues`,
   `procedureConceptSynonyms` — two tiny requests, catches any seed/edit/rollback);
   the **bundled release string**; a **schema number** (`CACHE_SCHEMA`); a
   **7-day max age**; and the **backend URL** (so a dev build pointed elsewhere
   never crosses environments).
3. **Bundled copy** — `src/data/nspc-catalogue.json` + `spinal-levels.json`,
   written by the publish step. Served before sign-in, when collections exist
   but are unseeded, and whenever the server is unreachable with no cache.

`CatalogueProvider` starts from the bundled copy synchronously, then refetches
once the user is authed.

### 4.2 `lib/procedure-catalogue.js` — search & levels (pure functions)

- **`buildSearchIndex` / `searchConcepts`** — lowercased index over preferred
  term, FSN, subspecialty and active synonyms. Scored 0–7: exact PT (0),
  exact synonym (1), PT prefix (2), synonym prefix (3), PT substring (4),
  synonym substring (5), FSN substring (6), all-tokens-somewhere for
  multi-word queries (7). Ties break alphabetically. Limit 20.
- **`extractLevelFromQuery`** — recognises a spinal level written the way
  surgeons type it: an interspace (`c5-c6`, `l4/5`) or a bare vertebra
  (`C5`, `T12`, `occiput`). Returns the matched level plus the remaining text.
- **`extractLateralityFromQuery`** — a leading `left`/`right`/`bilateral`
  (and `lt`/`rt`/`bilat`/`b/l`, optional `-sided`).
- **`searchWithQualifiers(index, lookup, query)`** — the entry point the picker
  calls. **The literal query always wins.** Only when it returns *zero* results
  are laterality and level stripped and the remainder re-searched, so
  `C5-C6 ACDF` and `Right CTR` resolve even though neither sides nor levels are
  in the catalogue, while an ordinary search is never shadowed. Returns
  `{ results, queryLevel, queryLaterality }` — the stripped qualifiers are
  handed back so they can pre-fill their slots on selection.
- **`demoteImplausibleRegions`** — when a level was typed, concepts whose
  `levelRegions` positively contradict the typed region are moved to the end of
  the results (never hidden — `levelRegions` is a hint, not a constraint).
- **Spinal-level helpers** — `buildLevelLookup`, `levelOptions` (levels for a
  concept, narrowed to its regions unless "show all"), `spannedVertebrae` /
  `spannedInterspaces` (a typed span like `L2-L5` expands to every vertebra /
  every fully-enclosed interspace it covers), `sortLevelCodes` (cranio-caudal,
  by `ordinal` — **never** by code string: `T2` precedes `T10` anatomically and
  follows it lexically).

### 4.3 `components/procedure-code-selector.jsx` — the picker

A combobox (`role="combobox"` + `aria-activedescendant`, focus stays in the
input). Behaviour:

- Emits a **change event** `{ target: { name, value } }` like `FormField`.
- The value object is `{ concept, freeText, postCoordination }`:
  - a **coded** pick → the full catalogue concept, `freeText: ""`;
  - **free text** that matches nothing → the `NSX-00000` sentinel concept,
    `freeText: "<typed text>"`;
  - an **empty box** → `null`.
- On selection, `buildValueFromConcept` pre-fills `postCoordination.laterality`
  and `postCoordination.spinalLevels` **only for slots the concept actually
  declares** (`lateralityApplicable`, `levelApplicable`) from the qualifiers the
  surgeon typed in the query. `postCoordination` is left `undefined` when empty.
- The panel below the input shows, for a coded value: the **`SpinalLevelPicker`**
  (toggle chips, region-narrowed with a "show all levels" escape, count derived
  and announced via `aria-live`) when `levelApplicable`; then `Laterality`,
  `Revision status` (both only when applicable) and `Priority` selects — each
  defaulting to an empty "Select" so a surgical record never invents a value;
  then a collapsible detail row with the concept id, release and facet chips.
- A free-text value shows an amber "Uncoded procedure" notice instead.

`stagedSequence` and `intentOverride` exist in the model and payload but have
no UI yet.

### 4.4 `lib/procedure-codes.js` — translation & rendering

| Function | Direction | Notes |
|---|---|---|
| `isFilledCode(entry)` | — | True if the entry has a concept or non-blank free text. `FormListField` pads the list with blank rows; these must not reach the server. |
| `toProcedureCodesPayload(entries)` | picker → API | Drops blank rows, flattens `postCoordination`, sets `position` from index. Concepts/levels travel as **catalogue ids** (`NSX-00001`, `C5-C6`), which is all the client has. |
| `fromProcedureCodeRecords(records, conceptById)` | stored → picker | Inverse of the above. Resolves `concept` by id against the loaded catalogue; sorts by `position`; rebuilds `postCoordination` (omitting falsy values, treating `stagedSequence === 0` as unset). |
| `describeProcedureCode(record, simplified?)` | stored → one line | `displayTerm || freeText || expand.concept.preferredTerm`, then qualifiers in parens: laterality label + level codes always; revision + priority + `Stage n` only when not `simplified`. |
| `describeProcedureCodes` / `…Simplified(procedure)` | — | All codes on an expanded procedure as an array of lines. |

Read-only views join lines with `" + "`:
[`procedure-details.jsx`](../../src/components/procedure-details.jsx),
[`procedure-expanded.jsx`](../../src/components/procedure-expanded.jsx),
[`procedure-simplified.jsx`](../../src/components/procedure-simplified.jsx),
[`otlist-print.jsx`](../../src/pages/otlist-print.jsx),
[`all-procedures.jsx`](../../src/pages/all-procedures.jsx),
[`patients.jsx`](../../src/pages/patients.jsx),
[`move-procedure-modal.jsx`](../../src/modals/move-procedure-modal.jsx).

### 4.5 Form integration

`procedure-form.jsx` renders `<FormListField type="procedure-code"
name="procedureCodes" …>`. `validateProcedure` treats `procedureCodes` as
required and uses `isFilledCode` (a length check would pass on the padded
blank rows). In `procedure-editor.jsx` the stored codes stay `null` until the
catalogue is in memory (resolving against an empty catalogue then saving would
silently delete every code); the form value falls back to the derived
`storedCodes` until the user edits.

---

## 5. Server write path (PocketBase hooks)

[`pb/pb_hooks/procedure-codes.js`](../../pb/pb_hooks/procedure-codes.js) exports
`syncProcedureCodes(txApp, procedureRecord, codes)`, called from within the
transaction hooks in
[`pb/pb_hooks/transactions.pb.js`](../../pb/pb_hooks/transactions.pb.js)
(`add-procedure-with-patient` and the bulk update route — the picker always
sends the whole `procedureCodes` array, and it is set aside from the rest of
the procedure fields and written after the procedure has an id).

`syncProcedureCodes`:

1. Deletes every existing `procedureCodes` row for the procedure and recreates
   from the payload (wholesale replace — `position` shifts on any add/remove, so
   a diff would be mostly rewrites).
2. Resolves `code.conceptId` → concept record; an unknown id is a
   `BadRequestError`, not a dropped code.
3. Resolves each `code.spinalLevels` code → level record, filtering by
   `kind = concept.levelKind` (a level code is only unique within a kind).
4. Stamps `catalogueRelease` and `displayTerm` from the concept **as it reads
   today** (`preferredTerm`, or the free text for the `NSX-00000` sentinel), so
   an old procedure keeps printing the way it was coded after a later release
   rewords or retires the concept.

The same file also exports `describeProcedureCodes(app, procedureRecord)` — a
deliberately narrow mirror of the client `describeProcedureCode` (term +
laterality + levels) used by the generated report, joined with `" + "`.

---

## 6. Read path

Procedures are loaded with the codes expanded. Expand strings to keep in sync
if the shape changes:

- `contexts/procedure-list-context.jsx`:
  `…,procedureCodes_via_procedure.concept,procedureCodes_via_procedure.spinalLevels`
- `pb/pb_hooks/procedure-codes.js` `PROCEDURE_EXPAND` (same two)
- `pages/all-procedures.jsx`, `pages/patients.jsx` (same two)

`procedureCodeRecordsOf(procedure)` reads
`procedure.expand.procedureCodes_via_procedure`.

---

## 7. Post-coordination fields

| Field | Values | Set where | In UI? |
|---|---|---|---|
| `laterality` | `left` / `right` / `bilateral` / `not-applicable` | picker (pre-fillable from query) | yes, when `lateralityApplicable` |
| `priority` | `elective` / `urgent` / `emergency` | picker | yes, always for a coded value |
| `revisionStatus` | `primary` / `revision` | picker | yes, when `revisionApplicable` |
| `spinalLevels` | ordered set of level codes | `SpinalLevelPicker` (pre-fillable from query) | yes, when `levelApplicable` |
| `stagedSequence` | int, null if not staged | payload only | no |
| `intentOverride` | overrides concept `defaultIntent` | payload only | no |

Constants: `LATERALITY_OPTIONS`, `PRIORITY_OPTIONS`, `REVISION_OPTIONS`,
`ALL_POST_COORDINATION_FIELDS`, `LEVEL_KIND_LABELS`, `FACET_LABELS` in
`lib/procedure-catalogue.js`.

---

## 8. Spinal levels

- Two kinds: **`interspace`** (disc/foramen work — discectomy, interbody
  fusion, foraminotomy) and **`vertebra`** (bone or construct work —
  laminectomy, corpectomy, fixation). Which kind a concept takes is fixed on the
  concept (`levelKind`), not chosen by the user.
- `levelRegions` narrows the picker's offered levels to plausible regions
  (e.g. lumbar interspaces for a lumbar microdiscectomy) — a **hint plus a soft
  warning**, with a "show all levels" escape, never a hard block.
- A typed span expands: `L2-L5` at a vertebra concept → `L4-L5 laminectomy`
  means the laminae of L4 and L5; `L2-L5 fusion` → all four bodies. At an
  interspace concept → every interspace fully enclosed by the span.
- **Order is cranio-caudal by `ordinal`.** Never sort level codes as strings.
- **Level count is derived, never stored.** There are no "single level" /
  "multilevel" concepts.

---

## 9. The uncoded sentinel `NSX-00000`

`Procedure not represented in the catalogue (procedure)` / `Uncoded procedure`.
Not searchable or browsable in the picker — the picker *assigns* it when the
typed text matched nothing. The typed text is stored in `freeText` and stamped
into `displayTerm`. No facets, `subspecialty = "uncoded"`, no post-coordination
applicability. It makes the coverage gap a query
(`concept.conceptId = "NSX-00000"`) rather than an invisible backlog, and is the
target of the `1788009377` backfill migration.

---

## 10. Invariants / gotchas

- **Concept ids are opaque, permanent, never reused.** Re-meaning a concept is
  forbidden — inactivate and mint a new id, set `replacedBy` on the old one.
- **Nothing is deleted from a release** — concepts, levels and facet values are
  retired with `active: false`. The publisher enforces this.
- **`catalogueRelease` and `displayTerm` on `procedureCodes` are snapshots** —
  do not "fix" them to follow the live concept.
- **Sort levels by `ordinal`, not code.**
- **The literal search query wins**; qualifier stripping is a zero-results
  fallback only.
- **Don't resolve stored codes against an empty catalogue and save** — it
  deletes them. The editor guards against this.
- **Generated seed migrations are not hand-editable** — change the spec files
  and `npm run codes -- publish` a new version.
- Keep the four expand strings in §6 in sync.
- `facet-values.json` is not bundled into `src/data` — only concepts + levels +
  the release stamp are.

---

## 11. File index

| Path | Role |
|---|---|
| [`specs/procedure_codes/neurosurgery-coding-system-spec.md`](./neurosurgery-coding-system-spec.md) | The full NSPC design specification (the *why*) |
| [`specs/procedure_codes/v2026.1/`](./v2026.1/) | The v2026.1 release source (concepts, levels, facet values) |
| [`scripts/procedure-codes.js`](../../scripts/procedure-codes.js) | Release manager (`npm run codes`) |
| [`src/data/nspc-catalogue.json`](../../src/data/nspc-catalogue.json) · [`spinal-levels.json`](../../src/data/spinal-levels.json) · [`catalogue-release.json`](../../src/data/catalogue-release.json) | Bundled fallback copy, written by publish |
| [`src/contexts/catalogue-context.jsx`](../../src/contexts/catalogue-context.jsx) | `CatalogueProvider` / `useCatalogue` |
| [`src/lib/catalogue-source.js`](../../src/lib/catalogue-source.js) | DB / cache / bundled sourcing + fingerprint |
| [`src/lib/procedure-catalogue.js`](../../src/lib/procedure-catalogue.js) | Search, qualifier extraction, spinal-level maths, constants |
| [`src/lib/procedure-codes.js`](../../src/lib/procedure-codes.js) | Picker ⇄ payload ⇄ display translation |
| [`src/components/procedure-code-selector.jsx`](../../src/components/procedure-code-selector.jsx) | The picker + `SpinalLevelPicker` |
| [`src/components/form-field.jsx`](../../src/components/form-field.jsx) · [`form-list-field.jsx`](../../src/components/form-list-field.jsx) | `type="procedure-code"` integration |
| [`src/forms/procedure-form.jsx`](../../src/forms/procedure-form.jsx) | Uses the field, validates `procedureCodes` |
| [`pb/pb_hooks/procedure-codes.js`](../../pb/pb_hooks/procedure-codes.js) | `syncProcedureCodes`, report rendering, `PROCEDURE_EXPAND` |
| [`pb/pb_hooks/transactions.pb.js`](../../pb/pb_hooks/transactions.pb.js) | Calls `syncProcedureCodes` on add / bulk update |
| [`pb/pb_migrations/1787734430…`](../../pb/pb_migrations/) … `1788009377…` | Schema + seed + backfill |
