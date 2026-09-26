# Procedure checklists

Status: **implemented**, steps 1-8 of §12. The append-only audit under
"Deferred" is not built, and template versioning (§11.1) remains undecided.

Assembly (§4) is covered by unit tests over the pure function; the write path
and reconciliation (§7) were exercised end to end against a copy of the dev
database. Nothing here has been driven through the browser.

This spec follows the conventions of
[`specs/procedure_codes/README.md`](../procedure_codes/README.md) and depends on
the collections it describes.

---

## 1. Concept in one paragraph

A **checklist template** is an authored list of items that applies to some slice
of the procedure catalogue: to everything, to a subspecialty, to a site, or to
named concepts. When a procedure is created, or whenever its procedure codes
change, the server collects every template matching any of the procedure's
codes, merges their items, trims duplicates, and materialises the result as
`procedureChecklistItems` rows attached to that procedure. Those rows are what
the ward ticks off. Templates are authoring-time data; the materialised rows are
the record of what was actually required and what was actually done.

---

## 2. Storage (PocketBase collections)

Three new collections. Ids are assigned by the migration that creates them —
follow the file shape of
[`1766253482_created_procedurePacStatuses.js`](../../pb/pb_migrations/1766253482_created_procedurePacStatuses.js).

| Collection | Purpose |
|---|---|
| `checklistTemplates` | One row per template. Carries the applicability rule. |
| `checklistTemplateItems` | The items of a template, ordered. Cascade-deleted with the template. |
| `procedureChecklistItems` | The materialised checklist for one procedure. Cascade-deleted with the procedure. |

### `checklistTemplates` fields

| Field | Type | Notes |
|---|---|---|
| `name` | text, required | Admin-facing label, e.g. "Spine — pre-op". |
| `description` | text | Optional. |
| `scope` | select, required | `all` \| `subspecialty` \| `site` \| `concept`. |
| `subspecialties` | json (array of strings) | Used when `scope = subspecialty`. Values from the 14 known subspecialties. |
| `sites` | relation → `procedureFacetValues`, multi | Used when `scope = site`. |
| `concepts` | relation → `procedureConcepts`, multi | Used when `scope = concept`. |
| `position` | number | Ordering between templates of equal specificity. |
| `active` | bool, default true | Inactive templates are ignored by assembly; existing rows are untouched. |
| `creator` / `updater` | relation → users | Matches the pattern on `procedures`. |

The target fields are **multi-valued on purpose**. The site vocabulary is flat —
42 terms, no parent/child (§10) — so "all spine" cannot be expressed as one
parent site. A single template targeting the seven vertebral-column and disc
sites is the intended way to say it. `scope` stays single-valued so specificity
(§4) is never ambiguous.

### `checklistTemplateItems` fields

| Field | Type | Notes |
|---|---|---|
| `template` | relation → `checklistTemplates`, cascade-delete, required | |
| `itemKey` | text, required | Stable slug, e.g. `consent-signed`. **This is the dedupe key** (§4). Unique within a template. |
| `label` | text, required | What the ward reads. |
| `hint` | text | Optional secondary line. |
| `required` | bool, default true | A `false` item is advisory; it does not count toward the outstanding total. |
| `group` | select, required | Which phase the item belongs to. See below. |
| `position` | number | Ordering within the template **and within the group** (§4). |

`group` is a select over a fixed vocabulary, in this order:

| Value | Heading | Meaning |
|---|---|---|
| `preop` | Pre-op | Must be done before the patient comes to theatre. |
| `dayof` | Day of surgery | Done on the day, in the ward or on arrival. |
| `theatre` | In theatre | Checked at the table. |
| `postop` | Post-op | After the procedure. |

The declaration order above **is** the group order; there is no separate
ordering field and no `checklistGroups` collection. A fixed select is chosen
over free text deliberately: free text would admit "Pre-op", "pre-op" and
"Preop" as three groups, and grouping is only useful if items from different
templates land under the same heading. Adding a value later is a migration, the
same as any other select in this schema.

### `procedureChecklistItems` fields

| Field | Type | Notes |
|---|---|---|
| `procedure` | relation → `procedures`, cascade-delete, required | |
| `itemKey` | text, required | Copied from the template item. Unique per procedure. |
| `label` | text, required | **Snapshot** of the template label at generation time (§10). |
| `hint` | text | Snapshot. |
| `required` | bool | Snapshot. |
| `group` | select | Same vocabulary as the template item. **Not** a snapshot — recomputed with `position` (§7). |
| `position` | number | Computed at assembly time (§4); already accounts for the group. |
| `sourceTemplate` | relation → `checklistTemplates` | Which template contributed the item that won. Nullable — the template may later be deleted. |
| `sourceScope` | select | `all` \| `subspecialty` \| `site` \| `concept`. Kept so the UI can explain *why* an item is on the list. |
| `checked` | bool, default false | |
| `checkedBy` | relation → users | |
| `checkedAt` | date | |
| `comment` | text | Optional free text against the item — why it is not done, which ward holds the result, a lab value. Entered by staff; never written by assembly. |
| `commentBy` | relation → users | Who last wrote `comment`. Cleared with it. |
| `commentAt` | date | When `comment` was last written. Cleared with it. |
| `applicable` | bool, default true | Set `false` when a ticked or commented item stops matching after a code change (§7). |
| `custom` | bool, default false | Added by hand to this one procedure rather than coming from a template. Exempt from the orphan pass (§7). |

A **custom item** is a one-off added to a single procedure: something true of
this patient that no template covers. It carries no `sourceTemplate` or
`sourceScope`, and assembly never produces it, which is exactly why it needs
the flag — without it the orphan pass would read "matches no template" as
"no longer applies" and delete it on the next code change.

Its `itemKey` is namespaced `custom-<slug-of-label>`, with a numeric suffix on
collision. The namespace matters: a bare slug could collide with a template key
added later, and the unique index would either reject it or, worse, let the
template item inherit a tick recorded against something else.

`comment` is user-entered, so it counts as work worth preserving on the same
footing as a tick: it is never overwritten by regeneration, and an item carrying
one is never silently deleted (§7). It is deliberately a plain text field rather
than a thread — [`procedureComments`](../../src/components/procedure-comments.jsx)
already exists for discussion about the procedure as a whole, and per-item
discussion is not what this is for.

The three comment fields move together. `comment`, `commentBy` and `commentAt`
are written in one call and cleared in one call; a non-empty `comment` with an
empty `commentBy` is a bug, not a state. This mirrors `checked` / `checkedBy` /
`checkedAt`, and is the reason both triples are written by a route rather than
by a collection update rule (§5).

Attribution is **last-writer-wins, not a history**: a second person editing the
comment replaces the text and takes over `commentBy`. The previous wording is
gone. If the wording itself needs to be recoverable, that is the append-only
audit described in §12, which these two fields do not replace.

---

## 3. Applicability

A template matches a **concept** when:

| `scope` | Matches when |
|---|---|
| `all` | Always. |
| `subspecialty` | `concept.subspecialty` ∈ `template.subspecialties`. |
| `site` | `concept.procedureSite` ∈ `template.sites`. |
| `concept` | The concept ∈ `template.concepts`. |

A template matches a **procedure** when it matches any concept on any of the
procedure's `procedureCodes` rows.

Two rules the requirements do not state, both needed:

- **A procedure with no codes** gets `scope = all` templates only.
- **The uncoded sentinel `NSX-00000`** carries subspecialty `uncoded` and no
  site, so it naturally matches `all` templates and any template that explicitly
  lists the `uncoded` subspecialty. Do not special-case it beyond that.

---

## 4. Assembly

Given a procedure and its codes, build the item list:

1. **Collect concepts.** Distinct concepts across the procedure's
   `procedureCodes` rows. Two codes on the same concept contribute once.
2. **Collect templates.** Every `active` template matching any collected concept
   (§3). A template matched via several concepts is collected once — this is the
   first place duplicates are trimmed.
3. **Expand to items.** For each template, its `checklistTemplateItems`, tagged
   with the matching template's `scope` and `position`.
4. **Trim duplicate items.** Group by `itemKey`. Where the same key comes from
   more than one template, **the most specific occurrence wins** and the others
   are discarded:

   ```
   concept  >  site  >  subspecialty  >  all
   ```

   Ties within the same specificity break on `template.position`, then
   `template.id`. The winner supplies `label`, `hint`, `required`, `group`,
   `sourceTemplate` and `sourceScope`.

   The winner supplying `group` matters: an item may sit in different groups in
   different templates, and the most specific template decides. One `itemKey` is
   one item in one group — a key cannot appear twice under two headings, because
   the key is the item's identity (§10).

   Dedupe is on `itemKey`, never on `label`. Two templates that both say
   "Consent signed" collapse only if both authored it as `consent-signed`. This
   is deliberate: label text is editable and translatable, keys are not.

5. **Order.** Sort by, in order:

   1. `group`, in the fixed vocabulary order of §2 — not alphabetically.
   2. template specificity, `all` first, so generic items head a group and
      concept-specific ones follow.
   3. `template.position`, then `item.position`.

   Write the resulting index into `position`, so a consumer that sorts on
   `position` alone gets grouped output without re-deriving any of this.

   **Groups cut across templates.** A `preop` item from the global template and
   a `preop` item from a spine template sit together under Pre-op; they are not
   kept in separate per-template blocks. This is the whole point of grouping,
   and it is why `group` outranks specificity in the sort rather than the other
   way round.

   A group with no surviving items is simply absent. Assembly emits no
   placeholder for it and the UI renders no empty heading.

Assembly returns **both** halves: the surviving items and the ones trimmed in
step 4, each tagged with the template it came from and the template that beat
it. Reconciliation (§7) uses the survivors and ignores the rest; the preview
(§8.3) renders both. Discarding the losers inside assembly would force the
preview to recompute them, which is the duplicate implementation §8.3 exists to
avoid.

Assembly is a pure function of (concepts, templates). Keep it that way — it
makes it testable without a procedure record, and it is what lets the preview
route and the two write paths share one implementation.

---

## 5. Server write path

Add `pb/pb_hooks/procedure-checklists.js` exporting
`syncProcedureChecklist(txApp, procedureRecord)`, mirroring the shape of
[`procedure-codes.js`](../../pb/pb_hooks/procedure-codes.js).

Call it from both routes in
[`transactions.pb.js`](../../pb/pb_hooks/transactions.pb.js) that already write
codes, immediately after `syncProcedureCodes`, inside the same transaction:

| Route | Line today | Trigger |
|---|---|---|
| `POST /api/add-procedure-with-patient` | `syncProcedureCodes` at line 104 | Procedure added. |
| `POST /api/bulk-update-procedures` | `syncProcedureCodes` at line 198 | Codes changed. |

On the create route, call it unconditionally — a procedure with no codes still
gets the `all` templates. On the update route, call it only when
`changes.procedureCodes !== undefined`, matching the existing guard.

Both routes already `require()` shared code inside the handler because handlers
run in their own scope. Follow that.

Ticking an item is a separate, small route rather than a direct collection
write, following
[`POST /api/add-pac-status`](../../pb/pb_hooks/transactions.pb.js):

```
POST /api/set-checklist-item   { itemId, checked?, comment? }
```

It stamps `checked`, `checkedBy` and `checkedAt` together, so the three cannot
drift. A direct update rule would let a client set `checked` without
`checkedBy`.

The route requires role `doctor` or `admin` for both ticking and commenting,
rejecting anything else with a `ForbiddenError` — the same guard
`add-procedure-with-patient` applies today:

```js
const role = authRecord.getString("role");
if (!(role === "doctor" || role === "admin")) {
    throw new ForbiddenError("Not authorized to update checklist");
}
```

Note that `add-pac-status` does **not** carry this check — it takes any
authenticated user. Follow `add-procedure-with-patient` here, not that.

`checked` and `comment` are both optional and independent: omitting a key leaves
that side alone, so saving a comment does not tick the item and ticking does not
clear a comment. The route rejects a call carrying neither.

Each side stamps its own attribution triple, and only its own:

| Key sent | Writes |
|---|---|
| `checked: true` | Sets `checked`, stamps `checkedBy` and `checkedAt` |
| `checked: false` | Clears all three of `checked`, `checkedBy`, `checkedAt` |
| `comment`, non-empty | Sets `comment`, stamps `commentBy` and `commentAt` |
| `comment`, empty string | Clears all three of `comment`, `commentBy`, `commentAt` |

**Unticking is allowed** and is an ordinary write on this route, available to the
same roles. It clears the whole tick triple rather than leaving a stale
`checkedBy` against an unticked item. This is lossy — the fact that someone had
asserted the item was done is gone — and that is accepted until the audit in
§12 exists.

Ticking never touches `commentBy` / `commentAt`, and commenting never touches
`checkedBy` / `checkedAt`. Sending both keys in one call writes both triples,
which is the expected shape when someone ticks an item and records why in the
same action.

Two further routes, same roles, for the custom items of §2:

```
POST /api/add-checklist-item      { procedureId, label, group, required?, hint? }
POST /api/remove-checklist-item   { itemId }
```

`add` mints the namespaced key and sets `custom`. `remove` **refuses a
non-custom item**: a template-derived item is governed by its template, and
deleting one from a single procedure would only bring it back on the next
sync — a delete that silently undoes itself is worse than a refusal.

---

## 6. Read path

`procedureChecklistItems` is a back-relation on `procedures`, so it expands as
`procedureChecklistItems_via_procedure`.

The procedure-codes spec §6 keeps a list of expand strings that must stay in
sync. **Do not add the checklist to them.** Those queries load whole lists of
procedures, and the checklist is only ever read for one expanded procedure at a
time; adding it would inflate every list query for something the list does not
render. Fetch it in the checklist component instead, as
[`procedure-comments.jsx`](../../src/components/procedure-comments.jsx) does.

---

## 7. Regeneration and preservation of staff input

This is the part the requirements do not cover and the part most likely to cause
harm if it is got wrong. Codes change on procedures that are already part-ticked.

`syncProcedureChecklist` must **reconcile, not replace.** This is the one place
it deliberately differs from `syncProcedureCodes`, which deletes and recreates
wholesale.

Let `desired` be the assembled key set (§4) and `existing` the current rows:

| Case | Action |
|---|---|
An item is **touched** when `checked` is true or `comment` is non-empty. Both are
staff input and neither may be discarded by a code change.

`group` and `position` are the exception to the snapshot rule (§10) and must be
rewritten together on every reconciliation. `position` encodes the group order
(§4), so a row whose `group` says `postop` while its `position` places it among
the pre-op items renders in the wrong section under the wrong heading. They
describe where the item sits in the current list, not what was asked of this
procedure — which is what the frozen `label` / `hint` / `required` are for.

| Case | Action |
|---|---|
| In both | Keep the row, its tick and its comment, each with its attribution intact. Update `group` and `position` together, and `sourceTemplate` / `sourceScope` if a more specific template now wins. **Do not restamp `label`, `hint` or `required`** — see §10. |
| Desired only | Create, stamping `label` / `hint` / `required` from the winning template item. |
| Existing only, untouched | Delete. Nothing was lost. |
| Existing only, touched | **Keep, set `applicable = false`.** Someone asserted this was done, or recorded why it was not; that is a clinical record. |
| `custom = true` | **Skip entirely.** Never deleted, never made inapplicable. |

A custom item is not "existing only" in any meaningful sense: no template was
ever going to produce it, so its absence from the assembled list says nothing
about whether it still applies. The only thing reconciliation may change on one
is its `position`.

Positions are therefore assigned across the **merged** list — assembled items
plus custom ones — rather than across the assembled list alone, or the two
would share indices. Within a group, custom items sort after the template
items, in the order they were added.

Inapplicable items render collapsed and struck through, excluded from the
outstanding count, with the comment still readable. If the codes change back, an
inapplicable row returns to `applicable = true` with its tick and comment intact.

A comment on an unticked item is the common case worth getting right: "awaiting
cross-match" against an outstanding item is exactly the state a ward wants to
survive a code edit.

---

## 8. Client

### 8.1 The checklist on a procedure

Replace the dummy in
[`procedure-checklist.jsx`](../../src/components/procedure-checklist.jsx). Its
current shape — a self-contained `Collapsible` whose summary carries the
outstanding count — is the right shape; only the data source changes.

- Fetch `procedureChecklistItems` filtered by procedure, sorted by `position`.
  `position` already encodes the grouping (§4), so the client groups by walking
  the sorted list and emitting a heading when `group` changes. It must not sort
  by `group` itself — that would re-derive the phase order client-side and get
  it alphabetical.
- **Group headings** use the labels from the §2 table. A group with no items
  renders no heading. If every item falls in one group, render the heading
  anyway rather than special-casing it away; a checklist that silently drops its
  only heading reads as ungrouped.
- Outstanding count = items where `required && applicable && !checked`. The
  existing amber/red `TriangleAlertIcon` badge already renders it. A comment does
  not affect the count — an item with "awaiting cross-match" against it is still
  outstanding, and that is the point of it.
- The badge in the collapsed summary stays a **single total across all groups** —
  it answers "is there anything left", and per-group counts there would be
  noise. A per-group count beside each heading is fine once expanded.
- Tick and untick via `POST /api/set-checklist-item`, optimistically. The
  checkbox is a plain toggle with no confirm step on untick — unticking is an
  ordinary correction, not a destructive action to guard.
- **Add a custom item** (§2) from a control below the list, not inside it, so
  an empty checklist can still be added to. The form itself is a **modal**,
  following `move-procedure-modal.jsx` and `add-pac-status-modal.jsx`: label,
  group, and whether it counts towards the outstanding total. Inline would be a
  text input, a select and two buttons on one row, which wraps into an unusable
  stack at phone width — the same reason moving a procedure is a modal.
  Custom items carry a delete affordance; template items do not, which is the
  clearest way to show that one is governed here and the other is not.
- **Comment**: an existing comment always renders under its item, so nothing is
  hidden behind a click, followed by `commentBy` name and `commentAt` in the
  small grey style [`procedure-comments.jsx`](../../src/components/procedure-comments.jsx)
  already uses for its author line. Expand `commentBy` on the fetch and on the
  subscription, as that component expands `creator`. Entry is a single-line input
  revealed by a small "note" affordance on the row, saved on blur or Enter — not
  a textarea, and not a modal. Send it on the same route, debounced, so a slow
  typist does not issue a write per keystroke.

**Realtime:** subscribe with the procedure filter passed to `subscribe`, not
only to the fetch:

```js
pb.collection("procedureChecklistItems").subscribe("*", handler, { filter });
```

This is not optional and not merely an optimisation. PocketBase builds its
subscription key from topic + serialised options and re-attaches its EventSource
listeners only when the *set of keys* changes. Selecting another procedure
unmounts one instance and mounts another in the same commit; without a
per-procedure filter both share the key `procedureChecklistItems/*`, the set
looks unchanged, and the new listener is registered but never attached — the
component goes silently dead. This was diagnosed and fixed in
[`pac-status.jsx`](../../src/components/pac-status.jsx) and
[`procedure-comments.jsx`](../../src/components/procedure-comments.jsx); do the
same here.

### 8.2 Template authoring — a settings dashboard page

Templates are created and edited from their own page in the settings dashboard,
at `/settings/checklists`.

Registering it is two steps, per the contract documented in
[`settings-dashboard.jsx`](../../src/pages/settings-dashboard.jsx): add
`src/dashboard/checklists.jsx` default-exporting
`{ title, icon, adminOnly: true, content }`, and add one line to the
`sidebarPages` object there. The `/settings/:page` route already exists — no
routing change. `content` is mounted as a component, not called, so the page may
hold its own state and effects.

Set `adminOnly: true`. Templates are admin-write (§9), and
[`users.jsx`](../../src/dashboard/users.jsx) is the existing precedent for a
page hidden from non-admins entirely rather than shown read-only.

**Shape: master–detail, not a single table.** Every other dashboard page is a
bare [`EditTable`](../../src/components/edit-table.jsx) over one flat
collection. This one cannot be, because a template owns an ordered child list in
`checklistTemplateItems`. Two panes:

- **Templates** — `EditTable` over `checklistTemplates` does fit this half. It
  already supports a `multi-select` column type, which is what `subspecialties`,
  `sites` and `concepts` need. Options: the 14 subspecialty strings, the 42
  `procedureFacetValues` rows where `facet = "site"`, and the concepts.
- **Items of the selected template** — its own editor over
  `checklistTemplateItems`: `itemKey`, `label`, `hint`, `required`, `group`,
  `position`. Items are listed under their group headings, and
  [`ReorderList`](../../src/components/reorder-list.jsx) runs **per group**
  rather than over the whole item list — it normalises `order` to 0..n-1 on
  change, and `position` is only ever compared within a group (§4), so one list
  spanning groups would produce an ordering that means nothing. Moving an item
  between groups is a change to `group`, not a drag across headings.

**Rules the page must enforce**, none of which the collections can:

- `scope` selects which target field is meaningful. The other two must be empty
  — changing `scope` clears them, rather than leaving orphaned targets that
  silently never match.
- `itemKey` is unique within a template and slug-shaped. It is an identity, not
  a label (§10): renaming one retires an item and creates another, orphaning
  every tick recorded against the old key. Warn on rename of a key already in
  use by materialised rows.
- Reusing an `itemKey` across templates is legitimate and is how dedupe is meant
  to be driven (§4) — do not warn on it. But where two templates give the same
  key a different `label`, surface it: the more specific template wins silently,
  and that is surprising unless shown.

**Editing a template does not change existing procedures.** Materialised rows
carry snapshots (§10); a reworded item reaches a procedure only when its codes
next change. The page should say this plainly, because the natural expectation
is that fixing a typo fixes it everywhere.

The page also carries a preview — §8.3.

### 8.3 Preview

The dedupe and specificity rules (§4) are invisible in a list of templates. An
author cannot otherwise tell that the `consent-signed` item they just reworded
in the global template never reaches spine cases because a spine template
overrides it, or that a template they created contributes nothing at all. The
preview is what makes assembly legible, and it is the difference between
templates being maintainable and being guesswork.

**Input.** One or more concepts, added one at a time through
[`ProcedureCodeBrowserModal`](../../src/modals/procedure-code-browser-modal.jsx),
which already browses the catalogue and calls `onSelect` with a concept — the
same way codes are added to a procedure. Several concepts matter: cross-template
dedupe only appears once more than one code is in play, which is exactly the
case an author cannot reason about unaided.

Zero concepts is a valid input, not an empty state. It previews the no-codes
case from §3: `all` templates only.

**Output.** Three parts, and the second is the one that carries the value:

1. **The assembled list** — final order and under its group headings, exactly as
   the ward would see it. Each row shows `label`, whether it is `required`, and
   which template contributed it with that template's scope. Where the winning
   template moved an item into a different group than a losing one had it in,
   say so on the row: a disappearing item is confusing, an item that moved
   headings is more so.
2. **Suppressed items** — every item discarded by step 4 of §4, with the
   template it came from and the template that beat it. A preview showing only
   winners explains nothing; the author's question is almost always "why is my
   item not showing".
3. **Matched templates** — each with the concept that matched it. Include
   templates that matched but contributed no surviving item: an author who built
   a template that is entirely overridden has almost certainly made a mistake,
   and nothing else will tell them.

Inactive templates are excluded from assembly, so a matched-but-inactive
template is shown greyed rather than omitted — "it is switched off" should be
the first available answer to "why is this contributing nothing", not a puzzle.

**Where it runs — a server route, not a second implementation.**

```
POST /api/preview-checklist   { conceptIds: [...] }
```

The preview exists to be trusted, so it must run the code that actually decides.
A client-side copy of §4 would be a second implementation of the specificity
order, the tie-breaks and the key-collision rules — precisely the logic most
likely to drift, and drift here is silent: the preview would keep looking
authoritative while being wrong.

The codebase already carries one deliberate mirror of this kind —
`describeProcedureCodes` in the hook mirroring the client's
`describeProcedureCode` ([procedure_codes §5](../procedure_codes/README.md)) —
and that one is defensible because it is narrow and its output is cosmetic.
Assembly is neither.

The route:

- Requires `admin`. It is an authoring tool, and it returns the whole matching
  template set, not just one procedure's result.
- Is **read-only**. It must not create, update or delete any
  `procedureChecklistItems`, and must not run inside a write transaction. Taking
  `conceptIds` rather than a procedure id is deliberate: there is no record in
  scope to mutate by accident.
- Calls the same exported assembly function the two write paths call (§5), with
  no preview-specific branch. Where the preview needs something the write path
  does not — the suppressed list — assembly returns it always and the write path
  ignores it. A `preview: true` argument threaded into assembly is the thing to
  avoid; it reintroduces the two code paths this route exists to prevent.

**It reflects saved templates.** An author who edits and previews without saving
sees the previous answer. Disable the preview while the editor is dirty, or save
first — quietly previewing stale state is worse than refusing to preview.

---

## 9. Access rules

Roles are `doctor`, `receptionist`, `admin`.

| Collection | Read | Create / Update | Delete |
|---|---|---|---|
| `checklistTemplates` | signed-in | `admin` | `admin` |
| `checklistTemplateItems` | signed-in | `admin` | `admin` |
| `procedureChecklistItems` | signed-in | none — hooks only | none |

Ticking and commenting both go through the route in §5, so
`procedureChecklistItems` needs no client-facing write rule.

**Only `doctor` and `admin` may tick or comment**, matching who may write
procedure codes. The two actions carry the same permission — a `receptionist`
may read the checklist and see what is outstanding, but may not tick an item or
attach a comment to one. This is enforced in the route (§5), not by a collection
rule, so there is exactly one place to change it.

---

## 10. Invariants / gotchas

- **`label`, `hint` and `required` on `procedureChecklistItems` are snapshots.**
  Editing a template must not rewrite what past procedures were asked to do.
  This mirrors `displayTerm` / `catalogueRelease` / `spinalLevelsSnapshot` on
  `procedureCodes` — and the same warning applies: do not "fix" them to follow
  the live template. `group` and `position` are **not** in this set: they are
  layout, recomputed together on every reconciliation (§7).
- **`itemKey` is the identity of an item**, across templates and across
  regeneration. Renaming a key is not an edit; it retires one item and creates
  another. Dedupe and tick preservation both hinge on this.
- **The site vocabulary is flat.** 42 terms, `SIT-0001`…, no hierarchy. There is
  no "spine" site. Cover breadth with multi-valued `sites`, or use the
  `subspecialty` scope, which does carry the cranial/spine split.
- **`subspecialty` is a plain indexed text field** on `procedureConcepts`, not a
  relation — match on the string, and keep the 14 known values in one place
  rather than retyping them.
- **A touched item is never silently deleted** (§7) — touched meaning ticked
  *or* carrying a comment. Assembly never writes or clears `comment`,
  `commentBy` or `commentAt`.
- **The two attribution triples move as units.** `checked` / `checkedBy` /
  `checkedAt` and `comment` / `commentBy` / `commentAt` are each written and
  cleared together, by the route in §5 and never by a client update rule.
- **Assembly runs inside the caller's transaction.** Take `txApp`, never `$app`.
- **Templates are authored data, not a published catalogue.** They get `active`
  and nothing else; they are deliberately *not* versioned the way the catalogue
  is (§11).
- **`procedures.requirements` is not a checklist and does not overlap one.** It
  is the list of equipment and setup to be laid out in the operating room for
  the case. Different audience (theatre staff preparing the room, not whoever
  clears the patient), different lifecycle (free text edited with the procedure,
  never generated from templates) and different lifespan (it stops mattering
  once the case starts). Leave it alone; do not fold either into the other, and
  do not seed checklist items from it.

---

## 11. Decisions still open

One left. My recommendation, to accept or overrule:

1. **Template versioning.** The catalogue carries full `catalogueRevisions`
   history. Templates could too. *Recommendation: no.* Label snapshots on the
   materialised rows already preserve what was asked of each procedure, which is
   the clinically meaningful history. Full revisioning is a large amount of
   machinery for admin-authored text.

---

## 12. Implementation order

1. Migration creating the three collections, with rules from §9.
2. `pb/pb_hooks/procedure-checklists.js` — assembly (§4) and reconciliation (§7)
   as pure functions over plain objects, plus the record I/O around them.
3. Wire into the two transaction routes (§5).
4. Seed migration with a starter global template and one spine template, to
   exercise dedupe across scopes.
5. `POST /api/set-checklist-item`.
6. Client: fetch, subscribe with filter, tick (§8.1).
7. Settings dashboard authoring page (§8.2) — templates table, then item editor.
8. `POST /api/preview-checklist` (§8.3), then the preview pane that renders it.
   The route is the smaller half: if step 2 returned both halves of the assembly
   result as specified in §4, it is a thin read-only wrapper.

Steps 1–4 are independently testable against a procedure with known codes;
do not start 6 before the assembly output is stable.

The seed templates in step 4 exist so steps 5–6 have something to render before
the authoring page is built. They are scaffolding, not the intended way to
manage templates — step 7 is. Once it lands, templates are created and edited
there, not by further seed migrations.

### Deferred

**Append-only audit of ticks and comments.** Agreed, but not in this build.

Until it exists, both triples are last-writer-wins and two operations are
lossy: unticking erases who had asserted the item was done, and overwriting a
comment erases the previous wording. That is accepted for now.

When it is built, it should record one immutable row per transition — the item,
the action (`tick` / `untick` / `comment-set` / `comment-cleared`), the value
being replaced, the actor and the timestamp — rather than adding history fields
to `procedureChecklistItems`. Two consequences worth designing for now, because
they are cheap now and awkward later:

- The route in §5 is the only writer of both triples, so it is also the only
  place that would need to emit audit rows. Keep it that way.
- Rows must survive their item. A reconciliation that deletes an untouched
  orphan (§7) must not cascade-delete its audit history, so the audit's relation
  to `procedureChecklistItems` should not be `cascadeDelete`, and should carry
  the `procedure` id directly.

---

## 13. File index

| Path | Role |
|---|---|
| `pb/pb_migrations/*_created_checklists.js` | The three collections. |
| `pb/pb_hooks/procedure-checklists.js` | Assembly + reconciliation. |
| [`pb/pb_hooks/transactions.pb.js`](../../pb/pb_hooks/transactions.pb.js) | Call sites (§5). |
| [`src/components/procedure-checklist.jsx`](../../src/components/procedure-checklist.jsx) | The UI (dummy today). |
| [`src/components/procedure-expanded.jsx`](../../src/components/procedure-expanded.jsx) | Where it is rendered. |
| `src/modals/add-checklist-item-modal.jsx` | Adding a custom item (§8.1). |
| `src/dashboard/checklists.jsx` | The authoring page (§8.2) and its preview (§8.3). |
| [`src/modals/procedure-code-browser-modal.jsx`](../../src/modals/procedure-code-browser-modal.jsx) | Concept picker the preview reuses. |
| [`src/pages/settings-dashboard.jsx`](../../src/pages/settings-dashboard.jsx) | Registers it in `sidebarPages`. |
| [`src/components/edit-table.jsx`](../../src/components/edit-table.jsx) | Templates half of the authoring page. |
| [`src/components/reorder-list.jsx`](../../src/components/reorder-list.jsx) | Item ordering. |
| [`specs/procedure_codes/README.md`](../procedure_codes/README.md) | The catalogue this matches against. |
