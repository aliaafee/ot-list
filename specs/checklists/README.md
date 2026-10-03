# Procedure checklists

Status: **implemented**, steps 1-19 of §12, including patient criteria (§3.1,
matching on patient age and sex) and priority (§3.2, matching on the priority
recorded on a procedure's codes). The append-only audit under "Deferred" is
not built, and templates are deliberately not versioned (§11.1).

Priority was checked the same way as the rest: the assembly cases of §12 step
16 against the pure function, the write path, preview route and import/export
end to end against a throwaway database, and the template form, the preview
and the procedure notice in headless Chrome.

Assembly (§4) and `ageInMonths` (§3.1) are covered by unit tests over the pure
functions; the write path, reconciliation (§7), the patient-criteria migration
and backfill, and the `update-patient` and `rebuild-checklist` routes (§5) were
exercised end to end against a copy of the dev database. The patient-criteria
UI — the notices and Rebuild button (§8.1), the template form's Patients block
(§8.2) and the preview's patient inputs (§8.3) — was checked in headless
Chrome against the same copy. The rest of the UI has not been driven through
the browser.

This spec follows the conventions of
[`specs/procedure_codes/README.md`](../procedure_codes/README.md) and depends on
the collections it describes.

---

## 1. Concept in one paragraph

A **checklist template** is an authored list of items that applies to some slice
of the procedure catalogue: to everything, to a subspecialty, to a site, or to
named concepts — optionally narrowed to codes recorded at a given priority
(elective, urgent, emergency) and to patients of a given sex or age range.
When a procedure is created, or whenever its codes or its scheduled day
change, or its patient's missing age or sex is first recorded, the server collects every template matching any
of the procedure's codes and its patient, merges their items, trims
duplicates, and materialises the result as
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
| `sexes` | select, multi, values `male` \| `female` | Patient criterion (§3.1). Empty = any sex. Same vocabulary as `patients.sex`. |
| `ageMinMonths` | number, integer, ≥ 0 | Patient criterion (§3.1). Inclusive lower bound. `0` = no lower bound. |
| `ageMaxMonths` | number, integer, ≥ 0 | Patient criterion (§3.1). **Exclusive** upper bound. `0` = no upper bound. |
| `priorities` | select, multi, values `elective` \| `urgent` \| `emergency` | Priority criterion (§3.2). Empty = any priority, including none recorded. Same vocabulary as `procedureCodes.priority`. |
| `creator` / `updater` | relation → users | Matches the pattern on `procedures`. |

The target fields are **multi-valued on purpose**. The site vocabulary is flat —
42 terms, no parent/child (§10) — so "all spine" cannot be expressed as one
parent site. A single template targeting the seven vertebral-column and disc
sites is the intended way to say it. `scope` stays single-valued so specificity
(§4) is never ambiguous.

The three patient-criteria fields are **not scopes**, and they sit alongside
`scope` rather than inside it. `scope` answers "which procedures"; the criteria
answer "which patients having them". A template has exactly one scope and any
combination of criteria, so "female patients having any spine procedure" is
one template: `scope = subspecialty`, `subspecialties = [spine]`,
`sexes = [female]`. §3.1 gives the reasoning.

`priorities` is a criterion of the same standing — beside `scope`, not inside
it, and free to combine with the patient criteria — but it is tested against
something different: the priority recorded on a procedure **code**, not
anything about the patient. "Emergency cranial trauma" is `scope =
subspecialty`, `subspecialties = [cranial-trauma]`, `priorities = [emergency]`.
One value, several, or none for "all priorities". §3.2.

Age is stored in **whole months**, not years, because the thresholds that
matter in paediatric neurosurgery sit below one year (neonate, infant). The
authoring page enters and shows it in years or months (§8.2); storage is
months only, so there is one unit to compare against. `0` doubles as "unset"
because a PocketBase number field stores blank as `0` — harmless for the lower
bound, where 0 means no bound anyway, and harmless for the upper bound, where
"under 0 months" would match no one.

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
| `sourceCriteria` | json | The winning template's criteria, `{ sexes, ageMinMonths, ageMaxMonths, priorities }`, only the set ones present, empty object when it has none. Same purpose as `sourceScope`: explaining *why*. **Not** a snapshot — recomputed with `sourceScope` (§7). |
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
template item inherit a tick recorded against something else. The namespace
is reserved: a template item key may not start `custom-`, which the dashboard,
import and a validate hook on `checklistTemplateItems` all refuse.

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

A template matches a **procedure** when **all** of these hold:

1. its scope matches the concept on at least one of the procedure's
   `procedureCodes` rows (or its scope is `all`),
2. its priority criterion (§3.2) passes on **one of those same rows**, and
3. its patient criteria (§3.1) pass for the procedure's patient.

Scope and priority are evaluated **per code, together**: both are facts about
a code row, and a template asking for "emergency spine" must find one row that
is both. Patient criteria are evaluated **once per procedure**, because a
procedure has one patient however many codes it carries.

Two rules the requirements do not state, both needed:

- **A procedure with no codes** gets `scope = all` templates only — still
  filtered by patient criteria, and none that set `priorities`, since there is
  no code to carry one (§3.2).
- **The uncoded sentinel `NSX-00000`** carries subspecialty `uncoded` and no
  site, so it naturally matches `all` templates and any template that explicitly
  lists the `uncoded` subspecialty. Do not special-case it beyond that.

### 3.1 Patient criteria (age and sex)

A template may narrow itself to patients by sex, by age range, or both. With
no criteria set it matches every patient, which is how every template behaved
before criteria existed — the migration adding the fields changes no
checklist.

| Criterion | Passes when |
|---|---|
| `sexes` empty | Always. |
| `sexes` set | `patient.sex` ∈ `sexes`. |
| `ageMinMonths` set (non-zero) | `ageMonths ≥ ageMinMonths`. |
| `ageMaxMonths` set (non-zero) | `ageMonths < ageMaxMonths`. |

All set criteria must pass. A template with `ageMinMonths = 144`,
`ageMaxMonths = 660`, `sexes = [female]` means "female, from 12th birthday,
under 55".

**The age range is half-open, `[min, max)`,** so adjacent bands tile without
overlap or gap: a paediatric template "under 16 y" (`ageMaxMonths = 192`) and
an adult one "from 16 y" (`ageMinMonths = 192`) never both match, and a
patient on their 16th birthday lands in exactly one. Inclusive-both-ends would
put that patient in both; exclusive-both-ends in neither.

#### Age as of when

**Age is computed on the date of the procedure's `procedureDay`**, not today.

- It is the age that is clinically relevant — the checklist is for the day of
  surgery.
- `procedureDay` is required on `procedures`, so the date always exists.
- It makes the result a function of stored data only. A procedure booked at
  15 y 11 m for a date after the 16th birthday gets the adult checklist at
  booking, and nothing has to wake up on the birthday to fix it. Computing
  against today would need a scheduled job re-evaluating every future
  procedure daily, and would make the checklist change with no write anyone
  can point to.

The cost: moving a procedure to another day can move the patient across a
boundary, so a change of `procedureDay` is a resync trigger (§5).

`ageMonths` is **whole completed calendar months** between `dateOfBirth` and
the day's date, both read as **UTC calendar dates** (the date part of the
stored value, no local-time conversion). A month is completed when the
day-of-month has been reached; a birthday on the 29th–31st in a shorter month
counts as reached on that month's last day. Put this in a small pure function
next to assembly (`ageInMonths(dateOfBirth, onDate)`) and unit-test the month
ends and leap day; it is the one piece of date arithmetic here and the one
most likely to be subtly off by one.

It must **not** reuse the client's `age()` in
[`dates.jsx`](../../src/utils/dates.jsx), which measures to *now* and returns a
display string.

#### Unknown age or sex

`dateOfBirth` and `sex` are both optional on `patients`, so a criterion will
often have nothing to test against. A `dateOfBirth` after the procedure date is
bad data and counts as unknown too.

**Rule: an unknown field fails every criterion on it.** A template with any
age bound is omitted when the age is unknown; a template with `sexes` set is
omitted when the sex is unknown. A template with no criteria on the missing
field is unaffected — an age-restricted template still applies to a patient of
unknown sex, and vice versa. (Decided; §11.2.)

So a patient with no date of birth gets exactly what a patient of any age
would get: the templates that do not care about age. Both "under 16" and
"from 16" are left out, so there is no conflicting pair to resolve and no
dedupe tie-break needed for unknowns. The checklist only ever holds items
known to apply.

**The cost is that an omission is invisible**, and that must be offset. A
child with no date of birth recorded would silently lose "parental consent",
and nothing in the list itself says anything is missing. So:

- **The procedure records which missing fields cost it templates.**
  `procedures.checklistMissingFacts` (§6) is `[]`, `["age"]`, `["sex"]` or both
  — a field is listed only when it is unknown **and** at least one active
  template matched on scope but was omitted for lack of it. A missing date of
  birth with no age-restricted templates in play lists nothing, so the notice
  below is not noise on every patient without a recorded age.
- **The checklist says so** (§8.1): one notice — "Date of birth not recorded:
  age-specific items have been left out" — with a link to edit the patient.
  This is what turns a short checklist into a prompt to fix the patient record.
  Shown on today's and future procedures only; a past one is left as it was
  (§8.1, §11.3).

It self-corrects: once the date of birth or sex is entered, the patient-edit
resync (§5) adds the items that now match. That first entry is the only
patient edit that rebuilds — correcting or clearing a recorded value does not
(§5). If a field is cleared, the change applies at the procedure's next
rebuild from another trigger, and then items that depended on it drop out —
untouched ones deleted, touched ones kept as inapplicable, in the ordinary way
(§7).

#### Why template-level criteria, not scopes or item-level

Three shapes were considered.

| Shape | Verdict |
|---|---|
| New `scope` values `sex` / `age` | **Rejected.** `scope` is single-valued (§2), so "female spine patients" could not be said at all, and the specificity order (§4) would have to rank "age" against "site", which has no answer. |
| Criteria on each **item** | **Rejected.** One spine template could hold a female-only item, but dedupe (§4) would have to decide whether a winning template's excluded item lets a losing template's version through. That is a second, harder dedupe rule for a saving of one small template. |
| Criteria on each **template**, alongside `scope` | **Chosen.** Criteria only filter which templates are collected (step 2); dedupe and ordering are unchanged except for one extra tie-break. A female-only item is a small template of its own — "Pregnancy test", `scope = all`, `sexes = [female]`, 12–55 y. |

### 3.2 Priority (elective, urgent, emergency)

A template may narrow itself to codes recorded at a given priority: one value,
several, or none. With `priorities` empty it matches at every priority,
including codes with none recorded — how every template behaves before the
field exists, so the migration adding it changes no checklist.

| `priorities` | Passes on a code when |
|---|---|
| empty | Always — "all priorities". |
| set | `code.priority` ∈ `priorities`. |

So "elective only" is `[elective]`, "urgent or emergency" is
`[urgent, emergency]`, and "all" is empty. Selecting all three is refused
(§8.2), for the same reason as every sex: it reads like "all" but fails on a
code with no priority recorded.

#### Where priority comes from

Priority is a **post-coordination qualifier**
([coding spec §5](../procedure_codes/neurosurgery-coding-system-spec.md#5-encounter-level-post-coordination)):
it is not part of a concept's identity and never appears in the catalogue —
there is no "emergency decompressive craniectomy" concept. It is recorded per
operation, on the `procedureCodes` row that binds a concept to this procedure,
as the optional select `priority` with exactly these three values. The
template field draws on that vocabulary; keep the list in one place
(`PRIORITY_OPTIONS` in
[`procedure-catalogue.js`](../../src/lib/procedure-catalogue.js)) rather than
retyping it.

That is why this is not a patient criterion and not a scope:

- **Not a patient criterion.** It is a fact about a code, so it is evaluated
  per code (§3), not once per procedure, and it changes when the codes are
  edited, not when the patient is.
- **Not a scope.** `scope` picks a slice of the *catalogue*, and priority is
  deliberately not in the catalogue. As a scope value it would also be
  single-valued against the others, so "emergency spine" could not be said —
  the same objection as for sex and age (§3.1).

Only `priority` is matched on. The other qualifiers on a code — laterality,
revision status, staged sequence, intent override, spinal levels — are not
template criteria. If one is wanted later, it is a sibling of `priorities`
evaluated the same per-code way; do not generalise ahead of the need.

#### Per code, with the scope

Scope and priority are tested **on the same code row**. A template with
`scope = subspecialty [spine]` and `priorities = [emergency]` matches when the
procedure has a spine code recorded as emergency. It does **not** match a
procedure with an elective spine code and an emergency cranial one: no single
row is both. For `scope = all`, any code at a listed priority will do.

A procedure whose codes carry **different** priorities is unusual — one
sitting usually has one urgency — but the data allows it, and it has a
consequence the patient criteria never have: an `[elective]` template and an
`[emergency]` template can both match the same procedure, each through a
different code. Their items are merged like any others, and where they reuse a
key the ordinary tie-break (§4) decides. This is left to `position` on purpose
(§11.5); the preview shows it (§8.3).

#### No priority recorded

`procedureCodes.priority` is optional, so a code may carry none.

**Rule: a code with no priority fails every `priorities` criterion** — the
same rule as unknown age or sex (§3.1), for the same reason: the checklist
only ever holds items known to apply. A template with `priorities` empty is
unaffected.

The omission is announced the same way. `"priority"` joins `"age"` and `"sex"`
in `procedures.checklistMissingFacts` (§6) when a code with no priority cost
the procedure at least one active template: the template's scope matched that
code, its `priorities` is set, and no other code of the procedure satisfied
it. A procedure with **no codes at all** counts the same way for a
`scope = all` template that sets `priorities`: nothing is recorded, and
recording a code with a priority is what would bring the template in. The
checklist then shows "Priority not recorded: priority-specific items
have been left out" (§8.1), pointing at the procedure's codes rather than at
the patient.

It self-corrects without a new trigger. Priority can only change by editing
the procedure's codes, and a code edit already rebuilds the checklist (§5).
Recording the priority adds the items that now match; changing it from
elective to emergency swaps them through the ordinary reconciliation (§7) —
untouched elective-only items deleted, touched ones kept as inapplicable, the
emergency ones added.

---

## 4. Assembly

Given a procedure, its codes and its patient, build the item list:

1. **Collect codes.** Distinct `(concept, priority)` pairs across the
   procedure's `procedureCodes` rows, `priority` being `null` when none is
   recorded. Two codes on the same concept at the same priority contribute
   once; the same concept at two priorities is two pairs, because a template
   may match one and not the other (§3.2).
   Alongside, resolve the **patient facts**: `{ ageMonths, sex }`, each `null`
   when unknown (§3.1), with age computed as of the procedure's day.
2. **Collect templates.** Every `active` template for which some collected
   pair satisfies both its scope and its priority criterion, **and** whose
   patient criteria pass (§3). A template matched via several pairs is
   collected once — this is the first place duplicates are trimmed. A
   criterion on an unknown value fails, so a collected template has every one
   of its criteria satisfied by a known value.
   Record, for templates that matched on scope but were omitted, which criteria
   failed and whether for lack of a value — this is what
   `checklistMissingFacts` (§6) and the preview (§8.3) are built from.
3. **Expand to items.** For each template, its `checklistTemplateItems`, tagged
   with the matching template's `scope`, `position` and criteria count.
4. **Trim duplicate items.** Group by `itemKey`. Where the same key comes from
   more than one template, **the most specific occurrence wins** and the others
   are discarded:

   ```
   concept  >  site  >  subspecialty  >  all
   ```

   Ties within the same scope break, in order, on:

   1. **More criteria wins.** Count sex as one, age as one (whether min,
      max or both is set) and priority as one (however many values are
      listed), so 0–3. A paediatric `consent-signed` at
      `scope = all` beats the global one without the author having to juggle
      `position` — overriding a generic item for a patient group is the main
      reason to reuse a key under criteria. Since a collected template has all
      its criteria satisfied (step 2), "criteria set" and "criteria satisfied"
      are the same count.
   2. `template.position`, then `template.id`.

   Priority adds no tie-break of its own. On a procedure whose codes carry
   different priorities, an `[elective]` and an `[emergency]` template can
   both be collected (§3.2) and both supply a key; they count one criterion
   each, so `position` decides. "The more urgent one wins" was considered and
   left out (§11.5).

   Scope still outranks criteria: a `concept`-scoped item beats an `all`-scoped
   one however many criteria the latter carries. A procedure-specific
   instruction is more specific than a patient-group one, and keeping scope
   first leaves the existing order untouched for every template without
   criteria.

   The winner supplies `label`, `hint`, `required`, `group`,
   `sourceTemplate`, `sourceScope` and `sourceCriteria`.

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
      concept-specific ones follow. Within a scope, templates with fewer
      criteria first, by the same reasoning.
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

The `templates` half of the result also lists templates whose scope matched
but whose **criteria excluded** them, each with the failing criteria and why:
`excludedBy: [{ field: "age", reason: "outOfRange" }]`, or `reason: "unknown"`
when the patient has no value for that field. They contribute nothing to the
items, but "why does my template not apply to this patient" is the new form of
the preview's central question.

A template whose scope matched some code but whose `priorities` no such code
satisfied is listed the same way, with `field: "priority"`. The reason is
`"unknown"` when at least one of the scope-matching codes has no priority
recorded, or the procedure has no codes at all — recording one might have
matched — and `"outOfRange"` when every one of them has a priority and none is
listed. (`outOfRange` is the existing word
for "has a value, and it is not an accepted one"; sex already uses it.)

The result also carries `missingFacts`: the fields that appear with
`reason: "unknown"` on at least one **active** excluded template — `"age"`,
`"sex"` or `"priority"`. The write path copies it to
`procedures.checklistMissingFacts` (§6); the preview shows it. Deriving it
inside assembly keeps "which missing fields mattered" in the one
implementation rather than recomputed by each caller.

Assembly is a pure function of (codes, patient facts, templates). Keep it
that way — it makes it testable without a procedure record, and it is what lets
the preview route and the write paths share one implementation. The codes go
in as plain `{ id, conceptId, subspecialty, site, priority }`, the priority
copied straight off the `procedureCodes` row. The patient
facts go in as plain `{ ageMonths, sex }`, already computed; assembly never
sees a date of birth or does date arithmetic. `ageInMonths` (§3.1) is its own
pure function, called by the record I/O layer before assembly.

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
| `POST /api/bulk-update-procedures` | `syncProcedureCodes` at line 198 | Codes, patient or day changed. |
| `POST /api/update-patient` *(new, below)* | — | Patient's date of birth or sex entered where it was missing. **Not** a correction to an existing value. |

On the create route, call it unconditionally — a procedure with no codes still
gets the `all` templates. On the update route, call it when **any** of these
keys is present in `changes`:

| Key | Why |
|---|---|
| `procedureCodes` | The existing guard: scope matching reads the codes. It is also the **only** way a code's priority changes (§3.2) — the qualifiers are part of each entry in this key — so priority matching needs no trigger of its own. |
| `procedureDay` | Age is computed as of the procedure's day (§3.1); a move can cross a birthday boundary. Moving a procedure sends this key through this route today. |
| `patient` | A different patient has a different age and sex. No client path reassigns a procedure's patient today, but the route accepts any key, so guard it rather than rely on that. |

The call moves out of the `procedureCodes` block to after it, so codes are
written before the checklist reads them. Reordering and marking removed send
none of these keys and still skip the sync.

Moving several procedures in one request resyncs each, and each reload of
templates is one query per template. Load templates once per request and pass
them in — give `syncProcedureChecklist` an optional third argument for the
preloaded set. That keeps assembly's input identical; it only avoids refetching
it.

#### `POST /api/update-patient`

```
POST /api/update-patient   { id, changes }
```

Replaces the direct `pb.collection("patients").update` in
[`edit-patient-modal.jsx`](../../src/modals/edit-patient-modal.jsx). Same roles
as the `patients` update rule today — `doctor` or `admin`. In one transaction:

1. Save the patient with `changes`, stamping `updater`.
2. If `dateOfBirth` or `sex` was **empty before and is set now** — compare
   the stored value with the new one, not key presence, since the edit modal
   sends the whole form — resync every procedure of that patient that is **not
   removed** and whose `procedureDay` date is **today or later**.

**Only a first entry rebuilds.** The three possible edits to each field:

| Edit | Rebuilds? | Why |
|---|---|---|
| Empty → set | **Yes** | The checklist left age- or sex-restricted items out for lack of the value (§3.1) and announced it with `checklistMissingFacts`. Entering the value is the fix that notice asks for, so it must take effect. |
| Set → different value (a correction) | **No** | Decided: a correction to the patient record does not reach into existing checklists. |
| Set → empty | **No** | Same rule: only filling a gap rebuilds. |

Sex and date of birth follow the same rule. When one field is filled in and
the other corrected in the same save, the fill-in rebuilds, and that rebuild
uses the current value of **both** — assembly reads the patient as it now is,
and there is no way to apply half of it.

**A correction is deferred, not ignored.** The procedure's checklist keeps the
old age or sex only until its next rebuild from another trigger — codes
changed, moved to another day, patient reassigned (§5). That rebuild reads the
corrected patient, and reconciliation (§7) then applies the difference in the
ordinary way. Freezing the facts on the procedure to stop this would also
freeze them against a move across a birthday, which is the case §3.1 exists to
handle.

Until then the checklist **says so and offers a rebuild**: it compares the
patient details it was built from (`procedures.checklistPatientBasis`, §6)
with the patient's current ones, and when they differ shows a notice with a
Rebuild button (§8.1) calling the route below. A correction therefore never
changes a checklist on its own, and on a today-or-future procedure never goes
unnoticed either — someone looking at the checklist decides when it takes
effect. Past procedures show no notice (§8.1, §11.3).

#### `POST /api/rebuild-checklist`

```
POST /api/rebuild-checklist   { procedureId }
```

Runs `syncProcedureChecklist` for one procedure, in a transaction, and nothing
else. Same roles as ticking — `doctor` or `admin` (§9). It rejects, with a
`BadRequestError`:

- a removed procedure;
- a **past** procedure — one whose `procedureDay` date is before today, the
  same cut-off `update-patient` uses above. The client never offers a rebuild
  there (§8.1), and the server enforces it so that a stale tab, a direct call
  or a later UI change cannot rewrite a completed procedure's checklist
  (§11.3). The message says why — "Checklists of past procedures are not
  rebuilt" — since a client that reaches it has a bug worth seeing.

A past procedure's checklist still rebuilds when its **codes** are edited
through `bulk-update-procedures` (§5): that is someone deliberately editing
that procedure, not a rebuild prompted by a patient edit, and it is left as it
was.

- It is the **same reconciliation** as every other trigger (§7), so ticks,
  comments and custom items survive, and a touched item that no longer applies
  is kept as inapplicable. That is why the button needs no confirm step: the
  only rows it can delete are untouched ones, which hold no staff input.
- It does **not** set `updater` on the procedure. Rebuilding a checklist is not
  an edit of the procedure, the same rule as `checklistOutstanding` (§6).
- It returns what changed — `{ added, removed, madeInapplicable, restored }`,
  counted by reconciliation as it goes — so the client can say "2 items added,
  1 no longer applies" rather than silently reshuffling the list.

The route is deliberately generic: it rebuilds from the current codes, day,
patient and templates, not only the patient. The notice is the one place that
offers it today (§8.1).

Past procedures are left alone even on a first entry (decided, §11.3). A
code change resyncs a past procedure because someone is editing *that*
procedure. A patient edit is an edit to a different record, and fanning it out
would rewrite the checklists of completed operations as a side effect nobody
was looking at.

Then set the `patients` update rule to `null` (§9). A route rather than a hook
on `patients` because:

- a direct update left open would let a first entry skip the resync, leaving
  items omitted and the "not recorded" notice showing for a value that is now
  recorded;
- the resync must be in the same transaction as the patient save, and every
  other checklist write in this spec already lives in a route in
  `transactions.pb.js` inside `runInTransaction`. An after-success record hook
  runs after commit, so a failed resync would leave the patient saved and the
  checklists stale with no error shown to the person who saved.

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

### `procedures.checklistOutstanding`

The collapsed list row still has to show whether anything is outstanding, and
it renders once per procedure — exactly the join the rule above forbids. So the
count is denormalised onto the procedure, the same trade already made for
`pacStatus`, which is a copy on `procedures` rather than a join to the status
history.

| | |
|---|---|
| Meaning | Items where `required && applicable && !checked`. |
| Written by | `syncOutstandingCount` in the checklist hook, called from reconciliation (§7) and from all three item routes (§5). |
| Read by | [`procedure-simplified.jsx`](../../src/components/procedure-simplified.jsx), straight off the procedure. |

Two rules it follows:

- **Only written when the number changes.** Ticking an advisory item, or
  editing a comment, leaves it alone — and so leaves the procedure's `updated`
  alone. Without this, every comment keystroke-save would touch the procedure.
- **`updater` is never set by it.** A checklist tick is not an edit of the
  procedure, so it must not claim to be one. `updated` still moves when the
  count genuinely changes; that is the accepted cost of the denormalisation.

It is derived, not a source of truth: the items are. If the two ever disagree,
`syncOutstandingCount` recomputes from the items.

### `procedures.checklistMissingFacts`

Items omitted because age or sex is unknown (§3.1), or because a code has no
priority recorded (§3.2), leave no row behind, so nothing in
`procedureChecklistItems` can say they are missing. The fact lives on the
procedure instead.

| | |
|---|---|
| Type | json, array of `"age"` \| `"sex"` \| `"priority"`, default `[]`. |
| Meaning | Fields that are unknown **and** caused at least one active, scope-matching template to be omitted — assembly's `missingFacts` (§4). `"age"` and `"sex"` are the patient's; `"priority"` is a code's. |
| Written by | `syncProcedureChecklist`, at the end of every reconciliation (§7). No other writer: it changes only when assembly re-runs. |
| Read by | The checklist component's notice (§8.1). It rides on the procedure record the component already has, so it needs no extra fetch. |

It follows the same two rules as `checklistOutstanding`: written only when the
value changes (compare as a sorted list, so `["sex","age"]` and
`["age","sex"]` do not count as a change), and never setting `updater`.

It is a **procedure** field, not a patient one, because whether a missing date
of birth matters depends on the procedure's codes: the same patient can have
one procedure where an age-restricted template would have applied and another
where none does.

### `procedures.checklistPatientBasis`

A correction to the patient does not rebuild (§5), so the checklist needs to
know which patient details it was built from, to tell when they are out of
date.

| | |
|---|---|
| Type | json, `{ dateOfBirth, sex }` — each the patient's value at the last rebuild, or `null` when it was missing. `dateOfBirth` as the date part only, `YYYY-MM-DD`. |
| Written by | `syncProcedureChecklist`, at the end of every reconciliation, beside `checklistMissingFacts`. Every rebuild, from every trigger, refreshes it. |
| Read by | The checklist component (§8.1), compared against `procedure.expand.patient`. |

**Out of date** means: `dateOfBirth` (date part) or `sex` on the patient now
differs from the basis. The comparison is plain equality on the two stored
inputs, on purpose:

- It needs no age arithmetic in the client, so there is no second copy of
  `ageInMonths` (§3.1) to drift.
- It can over-report. A date of birth corrected by a day that moves no age
  band shows the notice, and the rebuild then changes nothing — the route
  says "no changes" (§5). That is acceptable; telling the client exactly
  whether the result would differ means running assembly, which is what the
  rebuild is.
- It covers the procedure's day for free. A move rebuilds (§5), refreshing the
  basis, so the day never needs to be part of it.

Stores inputs, not the computed `{ ageMonths, sex }`, for the first reason:
comparing computed facts would need the client to compute them too.

**Priority is not part of the basis, and needs none.** The basis exists
because a patient can be edited without the checklist being rebuilt. A code's
priority cannot: it changes only through a code edit, which always rebuilds
(§5). A checklist is therefore never out of date with respect to priority, and
there is nothing to compare.

Same two rules as the other two fields: written only when the value changes,
and never setting `updater`.

Procedures whose checklist was built before this field existed are
**backfilled** from their patient's current values by the migration that adds
it. Those checklists were assembled before any template could carry patient
criteria, so no patient detail affected them, and any basis is accurate. An
empty basis would otherwise read as "everything changed" on every existing
procedure.

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
| In both | Keep the row, its tick and its comment, each with its attribution intact. Update `group` and `position` together, and `sourceTemplate` / `sourceScope` / `sourceCriteria` if a more specific template now wins. **Do not restamp `label`, `hint` or `required`** — see §10. |
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

**Patient changes use exactly this table.** A move across a birthday, or a
corrected date of birth or sex picked up at a later rebuild (§5), is a change
in `desired` like any code change, and nothing about preservation differs. The
case to test: a patient recorded as 15 has a ticked "parental consent"; the
date of birth is corrected to make them 17, which rebuilds nothing; the
procedure is later moved to another day; *that* rebuild leaves the item ticked
and marked inapplicable, and adds the adult consent item alongside it
unticked. When a date of birth is first *entered*, the rebuild it triggers
simply creates the age-restricted items that now match — there is nothing to
remove, because nothing was included on an unknown (§3.1).

**So do priority changes.** A code re-recorded from elective to emergency
changes `desired` like any other code edit. The case to test: an elective
procedure has a ticked "Pre-admission clinic attended" from an `[elective]`
template; the code's priority is changed to emergency; the rebuild leaves that
item ticked and marked inapplicable, deletes the untouched elective-only
items, and adds the `[emergency]` template's items unticked. Changing it back
restores the inapplicable row with its tick.

Reconciliation ends by writing `procedures.checklistMissingFacts` (§6) from
assembly's `missingFacts`, alongside `syncOutstandingCount`.

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
- **Omitted items.** When `procedure.checklistMissingFacts` (§6) is
  non-empty, show one notice above the list naming the missing fields — "Date
  of birth not recorded: age-specific items have been left out" — with a link
  to edit the patient. Show it even when the list is otherwise empty, since an
  empty checklist is exactly where an omission is easiest to miss. Also mark it
  on the collapsed summary, beside the outstanding badge, so a short or empty
  checklist does not read as "nothing to do": the badge counts only items that
  exist. One notice rather than anything per row, because the omitted items
  have no rows and the fix is one edit to the patient.
  - **Not shown on past procedures**, nor its summary mark — the same cut-off
    and the same reason as the out-of-date notice below. Filling in the
    missing field does not rebuild a past procedure (§11.3), so the notice
    would ask for a fix that cannot reach the checklist it is shown on.
    `checklistMissingFacts` is still stored on a past procedure; only the
    display is suppressed.
  - **`"priority"` is the same notice with a different fix.** It reads
    "Priority not recorded: priority-specific items have been left out", and
    its link opens the **procedure** for editing, not the patient — the
    priority is on the procedure's codes (§3.2). When both a patient field and
    priority are missing, show one notice per fix, since each has its own
    link. The "patient details changed" notice hides the patient one (below)
    but not this one: a code edit rebuilds on its own, whatever the patient
    basis says. Saving the codes rebuilds the checklist (§5), so the notice clears
    with no further step. Hidden on past procedures like the other, though
    for the second reason only: the fix *would* reach a past checklist, since
    a code edit rebuilds it, but a past checklist is not prompted to change
    (§11.3).
- **Patient details changed.** When `procedure.checklistPatientBasis` (§6)
  differs from the patient's current date of birth or sex, show a notice above
  the list — "Patient details have changed since this checklist was built" —
  naming what changed ("date of birth 12 Mar 2009 → 12 Mar 2011"), with a
  **Rebuild checklist** button calling `POST /api/rebuild-checklist` (§5).
  - **Not shown on past procedures** — those whose `procedureDay` date is
    before today, the same cut-off `update-patient` uses (§5), read from
    `procedure.expand.procedureDay.date`, which the list already expands. Nor
    is its mark on the collapsed summary. A completed procedure's checklist
    records what was asked on the day (§11.3); a patient edit afterwards is not
    news about that procedure, and a Rebuild button on it would invite
    rewriting it. The route refuses a past procedure as well (§5), so hiding
    the button is not the only safeguard.
  - Mark it on the collapsed summary too, the same way as missing facts: the
    outstanding count may be wrong until the rebuild.
  - The button shows only to `doctor` and `admin`, the roles the route accepts;
    a receptionist sees the notice without it. No confirm step — the rebuild
    preserves every tick and comment (§5).
  - While it runs, the button spins and the list stays as it is; the rebuilt
    rows then arrive through the existing subscription, so the component needs
    no refetch of its own. Show the route's summary as a toast — "Checklist
    rebuilt: 2 items added, 1 no longer applies", or "Checklist rebuilt: no
    changes" when the new details moved nothing.
  - The notice clears when the basis matches again, which the rebuild does by
    writing it. The procedure record arrives through its subscription, so this
    happens without a reload.
  - It reads `procedure.expand.patient`, which the procedure list already
    expands and subscribes to, so a patient edited elsewhere makes the notice
    appear live.
  - When both notices would apply — a recorded date of birth since cleared, so
    the basis has one and the patient does not — show only this one. It is the
    one with an action, and the rebuild will produce the missing-facts notice
    if it still applies.
- **Why an item is here.** Where the row already explains `sourceScope`, add
  its `sourceCriteria` in short form — "Spine · female · 12–55 y", or "Spine ·
  emergency", or "urgent or emergency". An item that appears for some patients
  or some priorities and not others is otherwise a puzzle to the ward.
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

Templates are created and edited in the settings dashboard, at
`/settings/checklists`, from
[`src/dashboard/checklists.jsx`](../../src/dashboard/checklists.jsx),
registered by one line in `sidebarPages` in
[`settings-dashboard.jsx`](../../src/pages/settings-dashboard.jsx).

`adminOnly: true`. Templates are admin-write (§9), and
[`users.jsx`](../../src/dashboard/users.jsx) is the existing precedent for a
page hidden from non-admins entirely rather than shown read-only.

**Shape: a list page and a detail page, not one table.** Every other dashboard
page is a bare [`EditTable`](../../src/components/edit-table.jsx) over one flat
collection. This one cannot be, because a template owns an ordered child list in
`checklistTemplateItems`. The page uses the settings shell's `detail`
descriptor instead, as documented at the top of `settings-dashboard.jsx`:

| Route | Component | What it is |
|---|---|---|
| `/settings/checklists` | `content` | The template list, search and the preview button. |
| `/settings/checklists/<id>` | `detail.content`, handed `{ record }` | One template: properties, then items. |
| `/settings/checklists/new` | `detail.content`, handed `record: null` | The same form in create mode. |

The shell loads the record, draws the breadcrumb (from `titleField: "name"`,
or `newTitle` for `new`), handles a missing id, and remounts on id change, so
the detail component does none of that.

**The list.** A plain table — name with description beneath, "Applies to"
(the scope label), order and status — each row linking to its detail page.
A search box filters in the browser on name, description and scope label; it
lives in the URL (`?search=`) so it survives opening a template and coming
back. "Add Template" goes to `/new`; "Preview" opens §8.3 in a modal.

**The detail page** has two parts:

- **Properties** — a form over one `checklistTemplates` row: name, order
  (`position`), status (`active`), description, "Applies to" (`scope`) and the
  one target field that scope reads, as a
  [`MultiSelectField`](../../src/components/multi-select-field.jsx). Target
  options are read from PocketBase, since these are relation fields storing
  record ids: `procedureFacetValues` where `facet = "site"`, all
  `procedureConcepts`, and the distinct subspecialty strings found on those
  concepts.

  An existing template **saves as it is edited**: a select or multi-select
  writes on change, a text field on blur, with a "Saving… / Saved" indicator.
  The local copy moves first and rolls back on failure. All saves share one
  request key, so the form locks while one is in flight rather than letting a
  second cancel the first. Emptying `name` puts the old value back with an
  error rather than sending a write that would be rejected.

  A new template is held locally until **Create**, because it does not exist
  yet and `name` is required. It starts **inactive**, so it does nothing until
  it has items and is switched on. Create navigates to the new id with
  `replace`, so Back returns to the list rather than to a create form.
- **Items** —
  [`ChecklistTemplateItems`](../../src/components/checklist-template-items.jsx),
  shown once the template exists. An add row (key, label, group, required),
  then the items under their group headings, each group its own
  [`ReorderList`](../../src/components/reorder-list.jsx). Ordering runs **per
  group** because `position` is only ever compared within a group (§4); one list
  spanning groups would produce an ordering that means nothing. Moving an item
  between groups is the group select on its row, not a drag across headings.
  Each row also has a delete button.

  Once added, an item's `itemKey`, `label` and `required` are **read-only**; the
  row shows them as text. Correcting one is delete and re-add. That is honest
  for the key — changing a key *is* retiring one item and creating another
  (§10) — and it means there is no rename path that could orphan ticks. `hint`
  has no field and is always saved empty.

**Rules the page enforces**, none of which the collections can:

- `scope` selects which target field is meaningful. Changing `scope` clears the
  other two targets rather than leaving orphans that silently never match. An
  empty target reads "Nothing chosen, so this template matches nothing."
- `itemKey` must match `ITEM_KEY_PATTERN` in
  [`src/lib/checklists.js`](../../src/lib/checklists.js) — lower-case words joined by hyphens —
  and be unique within the template.
- Reusing an `itemKey` across templates is legitimate and is how dedupe is meant
  to be driven (§4). The add row **suggests** every key already in use by other
  templates, filling in its label if none has been typed, so an existing key is
  reused rather than near-duplicated. Keys the current template already has are
  not offered.

**Not built yet**, and still wanted:

- **Differing labels on a shared key.** Where two templates give the same key a
  different `label`, surface it: the more specific template wins silently, and
  that is surprising unless shown. The suggestion list already loads every
  key's label and template set, which is the data this needs.
- **Editing an item after creation** — at least `label`, `hint` and `required`.
  Until then, delete and re-add loses the item's position and makes the
  reworded label a new row in the editor, though materialised procedure rows
  are unaffected either way (below).
- **The notice** that editing a template does not change existing procedures
  (below).

**Patient criteria** are a "Patients" block in the template form, below
"Applies to", independent of `scope` — changing scope does not clear them.

- **Sex**: the same multi-select control as the targets, options from the one
  shared list of sex values (put it in [`src/lib/checklists.js`](../../src/lib/checklists.js)
  beside `SCOPES`, matching `patients.sex`). Empty reads "Any sex".
- **Age**: two fields, "From" and "Under", each a number plus a unit select
  (years / months). Stored as months (§2). Show the saved range back in words —
  "from 12 y, under 55 y", "under 1 y", "any age" — because half-open bounds are
  easy to misread as inclusive.

Rules the page enforces:

- `ageMinMonths < ageMaxMonths` when both are set.
- **Refuse to save every sex selected**; ask for none instead. It looks
  equivalent to "any sex", but is not: it counts as a criterion for dedupe
  (§4), and if the `patients.sex` vocabulary ever gains a value, a template
  meant for everyone would silently stop matching those patients.
- Warn when two templates **reuse a key under criteria that can both hold** at
  the same scope and same criteria count — e.g. "under 16 y" and "under 18 y"
  both defining `consent-signed`. `position` then decides for 16- and
  17-year-olds, which is rarely what was meant. Criteria that cannot overlap
  (under 16 / from 16) are the intended pattern and get no warning.
- A template list column shows criteria in the same short form as §8.1, so
  patient-restricted templates are visible without opening each one.

**Priority** is one more control in the template form, directly below "Applies
to" and above "Patients": it qualifies the procedure, not the patient, and
belongs beside the scope it is tested with (§3.2). Like the patient criteria
it is independent of `scope` — changing scope does not clear it.

- The same multi-select control as the targets, options from
  `PRIORITY_OPTIONS` in
  [`procedure-catalogue.js`](../../src/lib/procedure-catalogue.js) — the list
  the procedure code picker already uses, so the two cannot drift. Empty reads
  "Any priority".
- **Refuse to save all three selected**; ask for none instead, as for sex. It
  looks like "all priorities" but is not: it fails on a code with no priority
  recorded, counts as a criterion for dedupe (§4), and would silently stop
  matching if the vocabulary ever gained a value.
- The short form (§8.1) and the template list column include it: "emergency",
  "urgent or emergency" — in urgency order whatever order they were ticked
  in, and ahead of sex and age. The column is headed "Only for" rather than
  "Patients", since it no longer describes only the patient.
- The **overlap warning** above treats priority like the other criteria: two
  templates at the same scope and criteria count that reuse a key overlap when
  their `priorities` share a value, or either is empty. Disjoint sets —
  `[elective]` and `[emergency]` — are the intended pattern and get no
  warning, even though a procedure with codes at both priorities can collect
  both (§3.2); that case is rare and is visible in the preview.

**Editing a template does not change existing procedures.** Materialised rows
carry snapshots (§10), and reconciliation never restamps `label`, `hint` or
`required` on a row that already exists (§7). A reworded item therefore reaches
only procedures that gain it fresh — a new procedure, or a resync (§5) in which
that key was not already on the list. A newly added item or template does reach
existing procedures, but only at their next resync, not at save. The page
should say this plainly, because the natural expectation is that fixing a typo
fixes it everywhere.

The list page also carries the preview — §8.3.

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

**A priority on each concept**, as a small select on its row — Not recorded /
Elective / Urgent / Emergency — because priority belongs to the code, not to
the procedure as a whole (§3.2). It defaults to **not recorded**, the
narrowest case: every template that sets `priorities` is left out and listed
with its reason, as for a code entered without a priority. Setting it per row
is what lets the author reproduce a mixed-priority procedure and see which of
two priority-specific templates wins a shared key.

**A patient**, as two controls beside the concepts: age (number plus years /
months, blank = unknown) and sex (Male / Female / Unknown). Both default to
**unknown**, which is the narrowest case — every template with criteria on
those fields omitted, as for a patient with nothing recorded — and each
excluded template is listed with its reason, so the author sees at once what
is being left out. The preview takes an age directly rather than a date of birth and a
procedure date: the author is asking "what does a 14-year-old get", and making
them invent two dates to say that adds nothing.

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
   and nothing else will tell them. Show each template's criteria, and list
   separately the templates whose scope matched but whose **criteria
   excluded** them, with the failing criterion and reason (§4) — "under 16 y —
   patient is 17 y", or "under 16 y — age unknown" — which answers the question
   before it is asked. Priority reads the same way: "emergency — no code at
   that priority", or "emergency — no priority recorded". The section is
   headed "Excluded by criteria", since not every criterion is the patient's.

When `missingFacts` is non-empty, show the same notice a ward would see on a
procedure (§8.1).

Inactive templates are excluded from assembly, so a matched-but-inactive
template is shown greyed rather than omitted — "it is switched off" should be
the first available answer to "why is this contributing nothing", not a puzzle.

**Where it runs — a server route, not a second implementation.**

```
POST /api/preview-checklist   { codes: [{ conceptId, priority? }, ...], patient?: { ageMonths?, sex? } }
```

`codes` replaces the earlier `conceptIds: [...]`: a bare list of concept ids
cannot say which priority each was recorded at. An omitted or `null`
`priority` means none recorded (§3.2); the route validates a given one against
the three values.

An omitted `patient`, or an omitted or `null` field in it, means unknown — the
same path a real patient with a missing field takes, omitting templates with
criteria on it (§3.1). The route
validates `sex` against the shared vocabulary and `ageMonths` as a
non-negative integer, then hands the facts to assembly unchanged. It never
computes an age itself, so it has no copy of `ageInMonths` to drift.

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

**It reflects saved templates.** Quietly previewing stale state would be worse
than refusing to preview. As built this cannot happen: the preview is a modal on
the **list** page, where nothing edits a template, and the detail page saves
every change as it is made (§8.2), so there is no unsaved state for it to miss.

If the preview is ever also placed on the detail page, beside the editor, it
must be told when a write lands. The pieces exist for that and are not wired
up: [`ChecklistPreview`](../../src/components/checklist-preview.jsx) takes a
`stale` prop that shows a notice, and `ChecklistTemplateItems` takes an
`onChanged` callback fired after every item write.

### 8.4 Export and import

The list page has **Export** and **Import** buttons, for moving templates
between databases — dev to production, or one hospital to another.

**The file** is JSON: `{ format: "ot-list.checklist-templates", version: 1,
exportedAt, templates: [...] }`. Each template has its fields from §2 and its
items, and **never carries record ids**: sites are written as their
`facetValueId` (`SIT-0003`) and concepts as their `conceptId` (`NSX-00012`),
the catalogue's stable ids. Record ids differ between databases, so a file
holding them would import as templates that silently match nothing.

```
GET  /api/export-checklist-templates
POST /api/import-checklist-templates   { file, dryRun?, inactive? }
```

Both require `admin`, and both run on the server in
[`checklist-templates-io.js`](../../pb/pb_hooks/checklist-templates-io.js).

**Import rules:**

- **All or nothing.** Every template is validated before anything is written,
  in one transaction. One bad template refuses the whole file, with a list of
  every problem. The checks are the authoring page's (§8.2): known scope and
  groups, slug-shaped keys unique within a template, a label on every item, no
  "every sex", `ageMinMonths < ageMaxMonths`, known `priorities` values and
  not all three of them, and every site and concept code present in this
  catalogue.
- **`priorities` is optional in the file.** A template without it imports
  with none set — any priority — so files exported before the field existed
  still import, and the format stays at `version: 1`. Export always writes it.
- **Never overwrites.** A template whose name (case-insensitive) is already
  taken is skipped and reported. Editing a live template changes what new
  procedures get, and that should be a deliberate edit on the page, not a side
  effect of a file. To replace one, delete it (§8.2) and import again.
- **Inactive by default.** The import modal's "import as inactive" option is on
  by default, so imported templates change nothing until each is switched on.
  Turned off, each template keeps the `active` it had in the file.
- **Target fields follow the scope.** Only the field the scope reads is kept;
  values in the other two are dropped with a warning, as the page clears them
  when the scope changes.
- **Warnings do not block** the import: no items, no targets chosen, or a
  subspecialty no catalogue concept carries.

**Dry run first.** Choosing a file opens a modal that calls the import with
`dryRun: true` — the same server code with the write step skipped — and lists
what will be created, what is skipped and why, warnings and errors. A file with
errors gets no Import button. Validation problems are returned in the response
body, not as an HTTP error, because they are an answer for the modal to show.

Importing creates templates only. Like any template edit, it does not change
existing procedures until their checklists are next rebuilt (§8.2).

---

## 9. Access rules

Roles are `doctor`, `receptionist`, `admin`.

| Collection | Read | Create / Update | Delete |
|---|---|---|---|
| `checklistTemplates` | signed-in | `admin` | `admin` |
| `checklistTemplateItems` | signed-in | `admin` | `admin` |
| `procedureChecklistItems` | signed-in | none — hooks only | none |
| `patients` *(changed)* | signed-in | create: signed-in (unchanged); **update: none — route only** | none (unchanged) |

Ticking and commenting both go through the route in §5, so
`procedureChecklistItems` needs no client-facing write rule.

`POST /api/rebuild-checklist` takes the same roles as ticking — `doctor` or
`admin` — checked in the route. A receptionist can see that a checklist is out
of date but cannot rebuild it. No role can rebuild a past procedure's checklist
through it (§5).

The `patients` update rule today is `doctor || admin`. It becomes `null`, and
the same two roles are checked in `POST /api/update-patient` (§5) instead, so
who may edit a patient does not change — only the path. Creation stays as it
is: a new patient has no procedures, so there is nothing to resync. (The
create-with-procedure path already runs inside `add-procedure-with-patient`,
which syncs unconditionally.)

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
  layout, recomputed together on every reconciliation (§7). Nor are
  `sourceScope` or `sourceCriteria`, which explain the current
  match rather than record what was asked.
- **Patient criteria filter; they are not a scope.** They decide which
  templates are collected (§4 step 2) and break ties within a scope (step 4);
  they never outrank scope. The same holds for `priorities`.
- **Priority is tested on the code, with the scope.** It is a post-coordination
  qualifier on a `procedureCodes` row (§3.2), not a property of the procedure
  or the patient: a template must find one row whose concept is in scope *and*
  whose priority is listed. Do not collapse a procedure's codes to a single
  "procedure priority" first — that would make "emergency spine" match an
  elective spine code sitting beside an emergency cranial one.
- **Empty `priorities` means all, and is the only way to say all.** Listing
  all three is refused (§8.2): it would fail on a code with no priority
  recorded.
- **The priority vocabulary is `procedureCodes.priority`'s.** Elective, urgent,
  emergency, from the coding spec. Do not add a value to the template field
  that a code cannot carry, or retype the list in a second place.
- **Age is as of the procedure's day, in whole months, from UTC dates.** Never
  as of today (§3.1), never from the client's `age()`, and never via local-time
  conversion — a date of birth stored at UTC midnight read in UTC+5 is still
  the same day, but read back through a local `Date` in a negative offset it is
  the day before.
- **Unknown fails, and says so.** A missing date of birth or sex — or a code
  with no priority recorded (§3.2) — fails every
  criterion on that field, omitting the template (§3.1), and the procedure's
  `checklistMissingFacts` records it (§6). The omission is only safe because it
  is announced: never drop the notice (§8.1) or stop writing that field, or a
  child with no date of birth silently loses the paediatric checks. The one
  exception is past procedures, where the notice is hidden on purpose (§8.1).
- **The upper age bound is exclusive.** `ageMaxMonths = 192` means *under* 16.
  The authoring page shows it in words for this reason.
- **Resync triggers are exactly**: codes, day or patient changed on the
  procedure, and a date of birth or sex **first entered** on the patient (§5).
  A new path that writes any of these must resync or it will leave checklists
  quietly wrong. `otDays.date` is not edited by any client path today (only
  `disabled` / `remarks`); if that ever changes, it joins this list.
- **Correcting a recorded date of birth or sex does not resync — on purpose.**
  Do not "fix" `update-patient` to rebuild on every change. The correction is
  picked up at the procedure's next rebuild — from another trigger, or from
  the Rebuild button the out-of-date notice offers (§5, §8.1). A today-or-future
  checklist can lag a corrected patient record, but never without saying so; a
  past one stays as it was, silently and on purpose (§11.3).
- **Every rebuild refreshes `checklistPatientBasis`.** It is written at the end
  of reconciliation, whatever triggered it. A code path that assembles and
  writes items without it would leave the notice showing on a checklist that is
  in fact current.
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
  is (§11.1).
- **`procedures.requirements` is not a checklist and does not overlap one.** It
  is the list of equipment and setup to be laid out in the operating room for
  the case. Different audience (theatre staff preparing the room, not whoever
  clears the patient), different lifecycle (free text edited with the procedure,
  never generated from templates) and different lifespan (it stops mattering
  once the case starts). Leave it alone; do not fold either into the other, and
  do not seed checklist items from it.

---

## 11. Decisions

All decided; none open. Kept with their reasons so they are not re-argued.

1. **Template versioning — decided: no.** The catalogue carries full
   `catalogueRevisions` history; templates do not. Label snapshots on the
   materialised rows already preserve what was asked of each procedure, which is
   the clinically meaningful history. Full revisioning is a large amount of
   machinery for admin-authored text.
2. **Unknown age or sex — decided: omit.** Templates with criteria on a
   missing field are left out (§3.1). The alternative, including them and
   marking them as guessed, was rejected: it pads the checklist with items that
   may not apply, can put both "parental consent" and "patient consent" on the
   same patient, and trains staff to tick without reading. The known cost —
   an omitted item leaves no row — is carried by
   `procedures.checklistMissingFacts` (§6) and the notice it drives (§8.1).
3. **A first-entered date of birth or sex resyncs past procedures — decided:
   no.** Only today's and future procedures are rebuilt (§5). A completed
   procedure's checklist records what was asked on the day, and a patient edit
   should not rewrite it as a side effect nobody was looking at. For the same
   reason both patient notices — out-of-date with its Rebuild button, and
   missing date of birth or sex — are hidden on past procedures (§8.1), so a
   past checklist is never prompted to change, and `POST /api/rebuild-checklist`
   refuses past procedures (§5).
   (Corrections to a recorded value resync nothing, past or future — §5.)
4. **Checklists built from since-corrected patient details — decided: flag
   and offer a rebuild.** A correction does not rebuild on its own (§5), but
   the checklist compares the details it was built from
   (`checklistPatientBasis`, §6) with the patient's current ones, shows a
   notice when they differ, and offers a Rebuild button (§8.1) calling
   `POST /api/rebuild-checklist` (§5). Without this, a date of birth corrected
   from 17 to 15 would leave the paediatric items out with nothing on screen to
   say so.
5. **Priority — decided: a template criterion tested per code, with no
   tie-break of its own.** Three shapes were weighed, as for sex and age
   (§3.1): a `scope` value (rejected — priority is not in the catalogue, and
   "emergency spine" could not be said), a criterion on each item (rejected —
   the same second dedupe rule), and a criterion on the template (chosen).
   Two further choices:
   - **Per code, not per procedure.** Reducing a procedure's codes to one
     priority first — "the most urgent of them" — was rejected. Priority is
     recorded per code because the coding spec makes it a qualifier of the
     concept it is attached to, and matching it anywhere else would let a
     template fire on a code it does not describe (§3.2).
   - **No "most urgent wins" tie-break.** When an `[elective]` and an
     `[emergency]` template both supply a key on a mixed-priority procedure,
     `position` decides, as for any two templates of equal standing. Ranking
     emergency above elective would need assembly to carry which code matched
     each candidate, for a case that is rare and that the author can settle
     with `position` and see in the preview (§8.3). Revisit if mixed-priority
     procedures turn out to be common.
   - **No priority recorded fails the criterion**, and is announced through
     `checklistMissingFacts` — decision 2 applied to a code instead of a
     patient.

---

## 12. Implementation order

1. Migration creating the three collections, with rules from §9.
2. `pb/pb_hooks/procedure-checklists.js` — assembly (§4) and reconciliation (§7)
   as pure functions over plain objects, plus the record I/O around them.
3. Wire into the two transaction routes (§5).
4. `POST /api/set-checklist-item`.
5. Client: fetch, subscribe with filter, tick (§8.1).
6. Settings dashboard authoring page (§8.2) — templates table, then item editor.
7. `POST /api/preview-checklist` (§8.3), then the preview pane that renders it.
   The route is the smaller half: if step 2 returned both halves of the assembly
   result as specified in §4, it is a thin read-only wrapper.

Steps 1–3 are independently testable against a procedure with known codes;
do not start 5 before the assembly output is stable.

**Patient criteria (§3.1)** — the second phase, on top of the above:

8. Migration: `sexes`, `ageMinMonths`, `ageMaxMonths` on
   `checklistTemplates`; `sourceCriteria` on `procedureChecklistItems`;
   `checklistMissingFacts` and `checklistPatientBasis` on `procedures`, the
   basis backfilled from each procedure's patient (§6). Blank criteria
   everywhere, so no existing checklist changes.
9. `ageInMonths(dateOfBirth, onDate)` and the criteria check, as pure
   functions with unit tests — month ends, leap day, the exact birthday,
   half-open bounds, unknowns. Then extend `assembleChecklist` to take patient
   facts, with the new tie-break (§4), `excludedBy` on templates and
   `missingFacts` on the result. Existing assembly tests must pass unchanged
   with facts `{ null, null }` and no criteria on any template.
10. Record I/O: resolve patient facts from `procedure.patient` and
    `procedureDay.date` in `syncProcedureChecklist`; write `sourceCriteria` in
    reconciliation, and `checklistMissingFacts` and `checklistPatientBasis` at
    its end; have reconciliation count what it added, removed, made
    inapplicable and restored.
11. Triggers (§5): widen the `bulk-update-procedures` guard; add
    `POST /api/update-patient`, rebuilding on first entry only, switch the edit
    modal to it, then close the `patients` update rule (§9) — in that order, so
    there is no window where patients cannot be edited. Test all three edits
    per field: empty → set rebuilds; set → different and set → empty do not.
12. Authoring page criteria block and its rules (§8.2); preview patient inputs
    and the excluded-templates list (§8.3).
13. `POST /api/rebuild-checklist` (§5), a thin wrapper over
    `syncProcedureChecklist` returning the counts from step 10. Refuses removed
    and past procedures; test both refusals and the today boundary.
14. Procedure checklist (§8.1): the omitted-items notice; the out-of-date
    notice with its Rebuild button and summary toast; both marks on the
    collapsed summary; the criteria in the "why" line.

Steps 8–10 are testable against a procedure whose patient has a known date of
birth, by editing it in the database and resyncing; step 11 is where the
automatic resync arrives.

**Priority (§3.2)** — the third phase.

15. Migration: `priorities` on `checklistTemplates`, a multi select over the
    three values of `procedureCodes.priority`. Blank everywhere, so no
    existing checklist changes and nothing is backfilled. `sourceCriteria` and
    `checklistMissingFacts` are json and need no schema change.
16. Assembly: take codes as `{ id, conceptId, subspecialty, site, priority }`
    and collect distinct `(concept, priority)` pairs (§4 step 1); test scope
    and priority on the same pair (step 2); count priority as a criterion in
    the tie-break and the ordering; report `field: "priority"` in `excludedBy`
    with `unknown` / `outOfRange`, and `"priority"` in `missingFacts`. Unit
    tests: each single value, a multi-value set, empty, no priority recorded,
    a mixed-priority procedure collecting both an `[elective]` and an
    `[emergency]` template, and "emergency spine" **not** matching an elective
    spine code beside an emergency cranial one. Existing assembly tests must
    pass unchanged with every code's priority `null` and no template setting
    `priorities`.
17. Record I/O: `codesOfProcedure` (was `conceptsOfProcedure`) reads
    `priority` off each `procedureCodes` row; `criteriaOf` includes `priorities`, so
    `sourceCriteria` carries it. No new trigger — check that changing only a
    code's priority through `bulk-update-procedures` rebuilds, and run the
    elective → emergency → elective case of §7.
18. Authoring and preview: the Priority control and its rules, the short form
    and the list column, the overlap check (§8.2); the per-concept priority
    select and the `codes` request shape on `POST /api/preview-checklist`,
    with the excluded-template reasons (§8.3); `priorities` in export and
    import, optional on the way in (§8.4).
19. Procedure checklist (§8.1): the "Priority not recorded" notice with its
    link to edit the procedure, its mark on the collapsed summary, and
    priority in the "why" line.

Step 16 is testable on its own against the pure function; 17 makes it live
for real procedures, at which point templates still have no way to set
`priorities` except through the database, so 18 follows directly.

Templates are created and edited only through the authoring page in step 6.
There is no seed data and no seed migration. Until a template exists, assembly
yields an empty checklist, which is the correct behaviour rather than a gap to
fill with fixtures.

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
| [`pb/pb_migrations/1790600000_created_procedure_checklists.js`](../../pb/pb_migrations/1790600000_created_procedure_checklists.js) | The three collections; the checklist fields on `procedures`, with the basis backfill (§12 step 8); closes direct writes to `procedures` and patient updates (§5). |
| [`pb/pb_migrations/1790600003_added_priorities_to_checklistTemplates.js`](../../pb/pb_migrations/1790600003_added_priorities_to_checklistTemplates.js) | `priorities` on `checklistTemplates` (§12 step 15). |
| [`pb/pb_hooks/checklist-validation.pb.js`](../../pb/pb_hooks/checklist-validation.pb.js) | Refuses template item keys starting `custom-`, which hand-added items use (§8.1). |
| `pb/pb_hooks/procedure-checklists.js` | Assembly + reconciliation. |
| [`pb/pb_hooks/transactions.pb.js`](../../pb/pb_hooks/transactions.pb.js) | Call sites (§5). |
| [`src/components/procedure-checklist.jsx`](../../src/components/procedure-checklist.jsx) | The UI (dummy today). |
| [`src/components/procedure-expanded.jsx`](../../src/components/procedure-expanded.jsx) | Where it is rendered. |
| `src/modals/add-checklist-item-modal.jsx` | Adding a custom item (§8.1). |
| [`src/dashboard/checklists/`](../../src/dashboard/checklists/) | The authoring page: template list, detail form (§8.2), preview modal (§8.3). |
| [`src/components/checklist-template-items.jsx`](../../src/components/checklist-template-items.jsx) | Item editor on the detail page (§8.2). |
| [`src/components/multi-select-field.jsx`](../../src/components/multi-select-field.jsx) | Target-field picker (§8.2). |
| [`src/lib/checklists.js`](../../src/lib/checklists.js) | `SCOPES`, `GROUPS`, `ITEM_KEY_PATTERN` — shared vocabularies. |
| [`src/modals/procedure-code-browser-modal.jsx`](../../src/modals/procedure-code-browser-modal.jsx) | Concept picker the preview reuses. |
| [`src/pages/settings-dashboard.jsx`](../../src/pages/settings-dashboard.jsx) | Registers it in `sidebarPages`. |
| [`src/components/reorder-list.jsx`](../../src/components/reorder-list.jsx) | Item ordering. |
| [`specs/procedure_codes/README.md`](../procedure_codes/README.md) | The catalogue this matches against. |
| [`specs/procedure_codes/neurosurgery-coding-system-spec.md`](../procedure_codes/neurosurgery-coding-system-spec.md) | §5: post-coordination, where `priority` and its three values are defined (§3.2). |
| [`src/lib/procedure-catalogue.js`](../../src/lib/procedure-catalogue.js) | `PRIORITY_OPTIONS` — the one list of priority values (§3.2, §8.2). |
| [`pb/pb_hooks/procedure-codes.js`](../../pb/pb_hooks/procedure-codes.js) | Writes `priority` onto each `procedureCodes` row; what assembly reads (§3.2). |
| [`src/modals/edit-patient-modal.jsx`](../../src/modals/edit-patient-modal.jsx) | Moves to `POST /api/update-patient` (§5). |
| [`src/components/checklist-preview.jsx`](../../src/components/checklist-preview.jsx) | Preview pane; gains patient inputs (§8.3). |
| [`pb/pb_hooks/checklist-templates-io.js`](../../pb/pb_hooks/checklist-templates-io.js) | Template export and import (§8.4). |
| [`src/modals/import-checklist-templates-modal.jsx`](../../src/modals/import-checklist-templates-modal.jsx) | Import dry-run and confirm (§8.4). |
| [`src/utils/dates.jsx`](../../src/utils/dates.jsx) | Client `age()` — display only, **not** for matching (§3.1). |
