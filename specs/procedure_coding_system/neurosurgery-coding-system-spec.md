# IGMH Neurosurgery Procedure Coding System (NSPC)

**Version 0.2 — draft for departmental review**
Department of Neurosurgery, Indira Gandhi Memorial Hospital, Malé

---

## 1. Purpose and design constraint

The department needs a single controlled vocabulary for naming operations so that OT lists, operative notes, audit, and research all refer to the same thing by the same name. The Maldives is not a SNOMED International Member territory, so licensed SNOMED CT content cannot be embedded today without an MLDS affiliate licence.

The design constraint is therefore: **build a local vocabulary now, but build it in the shape SNOMED CT already has**, so that adopting SNOMED CT later is a mapping exercise rather than a rebuild.

Three decisions carry that constraint:

1. **Opaque, permanent local identifiers** — never semantic, never reused, never renumbered.
2. **A faceted concept model that mirrors SNOMED CT's Procedure attributes** — so each local concept decomposes into the same axes SNOMED uses.
3. **Post-coordination slots held at the encounter level, not baked into the concept name** — laterality, urgency, revision status, staging and **spinal level** are recorded as structured fields against the operation, not as separate catalogue entries.

Decision 3 is the one that saves the most pain. Without it, a catalogue of 80 procedures becomes 800 within two years as every laterality and urgency permutation gets its own row, and the mapping to SNOMED becomes intractable.

Spinal level is the sharpest illustration of decision 3, which is why it gets its own section (§5.1). There are 25 named intervertebral levels and 27 named vertebrae; pre-coordinating them would turn 15 spine concepts into several hundred rows, and multi-level operations — a two-level ACDF, a T4–T10 fixation — would still not be representable, because the combinations are unbounded.

---

## 2. Identifier policy

Format: `NSX-` followed by a five-digit zero-padded integer. Example: `NSX-00042`.

Rules, which are non-negotiable once the first record is entered:

- Identifiers are **opaque**. `NSX-00042` carries no meaning. Do not encode subspecialty, body region, or anything else into the number. Every semantic coding scheme eventually needs a code that doesn't fit its own scheme.
- Identifiers are **permanent**. If a concept is found to be wrong, duplicated, or clinically invalid, it is **inactivated**, not deleted and not edited into something else. Historical operative records must continue to resolve.
- Identifiers are **never reused**. The counter only goes up.
- Renaming is allowed; re-meaning is not. If the meaning changes, mint a new identifier and set `replaced_by` on the old one.

This mirrors how SNOMED CT itself handles concept lifecycle, which is why the migration later is clean.

---

## 3. Concept model

Each catalogue entry is described by facets deliberately chosen to correspond to SNOMED CT's Procedure concept model attributes.

| NSPC facet | Corresponding SNOMED CT attribute | Purpose |
|---|---|---|
| `method` | Method | The action performed — excision, drainage, insertion, fixation |
| `procedure_site` | Procedure site — Direct | The anatomical target |
| `surgical_approach` | Surgical approach | Pterional, retrosigmoid, transsphenoidal, posterior midline |
| `device` | Direct device / Using device | Shunt, EVD catheter, pedicle screw, aneurysm clip |
| `morphology` | Procedure morphology | The lesion being addressed — neoplasm, haematoma, aneurysm |
| `intent` | Has intent | Therapeutic, diagnostic, palliative |

Facets are populated with **controlled values from the `facet_value` table**, not free text. Each facet value is itself a candidate for later SNOMED mapping, which means a single facet value mapped once benefits every procedure that uses it.

A concept that cannot be expressed in these facets is a signal that the concept is either too vague or is really two procedures.

Spinal level is deliberately **not** a facet. Facets define what a concept *is* and are fixed for the concept; level varies per operation, so it lives in its own vocabulary (`spinal_level`) and is applied at the encounter — see §5.1.

---

## 4. Naming convention

Two names per concept, following SNOMED CT's own pattern:

**Fully specified name (FSN)** — unambiguous, unabbreviated, with a semantic tag:

> `Craniotomy and evacuation of acute subdural haematoma (procedure)`

**Preferred term (PT)** — what appears in the UI:

> `Craniotomy, acute SDH evacuation`

**Synonyms** are held in a separate table, many-to-one, and exist purely to make search work. This is where department jargon belongs — `crani`, `VP shunt`, `burr hole`, `chronic SDH`, `ACDF`, `MVD`. Search hits a synonym; the system stores the concept ID. Registrars should never have to know the formal name to find the right entry.

FSN rules:
- No laterality. `Right pterional craniotomy` is wrong; laterality is an encounter field.
- No urgency. `Emergency decompressive craniectomy` is wrong.
- No revision status. `Redo VP shunt` is wrong; `revision_status` is an encounter field.
- No spinal level, and no level *count*. `ACDF C5-C6` is wrong, and so is `Anterior cervical discectomy and fusion at single level` — both are `spinal_levels` on the encounter, and the count is derived from it.
- No surgeon-specific or eponymous shorthand in the FSN — those go in synonyms.

Levels do belong in **synonyms**, because that is how registrars search. `C5-C6 ACDF` typed into the picker should find the ACDF concept; the system then stores the concept ID and the level separately.

---

## 5. Encounter-level post-coordination

The `procedure_performed` record binds a catalogue concept to a patient episode and adds the qualifiers. These are the fields that vary per operation and must never generate new catalogue rows:

| Field | Values | SNOMED attribute it maps to |
|---|---|---|
| `laterality` | left / right / bilateral / not-applicable | Laterality |
| `priority` | elective / urgent / emergency | Priority |
| `revision_status` | primary / revision | Revision status |
| `staged_sequence` | integer, null if not staged | — |
| `intent_override` | overrides catalogue default where needed | Has intent |
| `spinal_levels` | ordered set of level codes — see §5.1 | Procedure site — Direct (refinement) |

Multiple concepts can attach to one episode — a decompressive craniectomy plus an ICP monitor insertion is two `procedure_performed` rows with a shared episode, one flagged primary.

When you migrate, these fields become the refinement terms of a post-coordinated SNOMED expression. Nothing is lost.

---

## 5.1 Spinal level

Spine operations are identified in practice by the level they were done at — `C5-C6 ACDF`, `L4-L5 microdiscectomy`, `T9-T12 fixation`. The level is not part of the procedure's identity; it is a property of the operation, exactly like laterality. It is therefore recorded on `procedure_performed` and never in the catalogue.

### Two kinds of level

A level is either an **interspace** or a **vertebra**, and which one a procedure takes is a property of the procedure, not a choice the user makes:

| Kind | Vocabulary prefix | Term form | Procedures that take it |
|---|---|---|---|
| `interspace` | `ISP-` | `C5-C6`, `L4-L5`, `L5-S1` | Anything acting on a disc space or a neural foramen — discectomy, interbody fusion, foraminotomy |
| `vertebra` | `VRT-` | `Occiput`, `C2`, `T7`, `L4`, `S1` | Anything acting on bone or spanning a construct — laminectomy, corpectomy, vertebroplasty, pedicle screw fixation, laminoplasty |

Conflating the two is the most common way spine data becomes unusable for audit. `L4-L5 laminectomy` is ambiguous — it may mean the laminae of L4 and L5, or the interlaminar space; recording it as the two vertebrae `L4` and `L5` removes the ambiguity. Conversely a microdiscectomy is *never* at a vertebra; `L4` alone is not an answer to where the disc was.

Each catalogue concept therefore carries:

- `level_applicable` — whether the level slot means anything for this concept at all (0 for every cranial concept),
- `level_kind` — `interspace` or `vertebra`, whichever the procedure acts on,
- `level_regions` — which regions are plausible, so the picker offers `L1-L2`…`L5-S1` for a lumbar microdiscectomy rather than all 25 interspaces. A hint for the UI and a soft validation warning, not a hard constraint — thoracic discs do occasionally get approached in ways the catalogue didn't anticipate.

### Multiple levels

`spinal_levels` is an **ordered set**, not a single value. A two-level ACDF is one `procedure_performed` row with two levels attached, not two rows and not a different concept:

```
concept_id     NSX-00089   (Anterior cervical discectomy and fusion)
spinal_levels  [C4-C5, C5-C6]
laterality     not-applicable
priority       elective
```

Order is cranio-caudal, held explicitly in `sequence` rather than left to string sorting — `T2` sorts before `T10` anatomically and after it alphabetically, and every level list is wrong the first time someone forgets this. The vocabulary carries an `ordinal` column for exactly this reason.

**Level count is derived, never stored.** "Single level" versus "multilevel" is `COUNT(*)` over the attached levels. Concepts that previously encoded the count in their name (`… at single level`, `… at multiple levels`) were inactivated in release `v2026.3` and replaced by a single count-neutral concept each, per the identifier policy in §2.

### Rendering and snapshots

Per §6, `procedure_performed` stores a `spinal_levels_snapshot` string (`"C4-C5, C5-C6"`) alongside the structured rows, so an operative note renders with the level text that was on screen when it was signed even if the level vocabulary is later revised. The structured child rows are what audit and research query; the snapshot is what gets printed.

### Mapping

Level maps to a refinement on the procedure site rather than to a distinct concept. In a post-coordinated SNOMED CT expression the level qualifies `Procedure site - Direct`, so `map_expression` — not `target_code` — is the right target for level-bearing procedures. Levels themselves have stable SNOMED concepts (`C5-C6 intervertebral disc`, `Fifth lumbar vertebra`), so `spinal_level_map` is worth populating early: 52 rows that make every spine concept's expression mechanical.

---

## 6. Versioning

Every table carries `effective_from`, `effective_to`, `active`, and rows are **appended, never updated in place**. This is deliberately RF2-shaped — the format SNOMED CT releases actually ship in.

The practical consequence: an operative note written in 2026 can still be rendered with the exact term text that was on screen when it was signed, even after the catalogue has been revised twice. For medico-legal and audit purposes this matters more than it might appear.

The application stores, on every `procedure_performed` row:
- the concept ID,
- a **snapshot of the display term at the time of recording**,
- a **snapshot of the rendered spinal level list**, where one applies,
- the catalogue release version in force.

---

## 7. Mapping to SNOMED CT (and ICHI)

The `concept_map` table is deliberately generic — one row per (local concept, target system, target code) triple, so the same structure serves SNOMED CT, ICHI, and ICD-10-PCS without redesign.

Correlation values follow FHIR ConceptMap equivalence semantics:

| Value | Meaning |
|---|---|
| `equivalent` | Same meaning, safe to substitute |
| `wider` | Target is broader than the local concept — detail is lost |
| `narrower` | Target is narrower — the local concept covers more |
| `inexact` | Overlapping but neither subsumes the other |
| `unmatched` | No suitable target concept exists |

Where no single precoordinated SNOMED concept exists, populate `map_expression` with a post-coordinated SNOMED CT expression instead of `target_code`. This is common in neurosurgery, where approach-specific procedures are often not precoordinated.

**The mapping table ships empty, and this is intentional.** SNOMED concept identifiers must be looked up against a real release, not recalled or guessed — a wrong 9-digit identifier is silently wrong and propagates into every downstream record. Populate it from `browser.ihtsdotools.org` (public, free to browse), working through the catalogue subspecialty by subspecialty, and record `source_release` for every row so the mapping can be revalidated at each SNOMED release.

Start mapping the facet values before the full concepts. There are far fewer of them, and a mapped facet vocabulary makes the concept-level mapping largely mechanical.

---

## 8. Governance

A vocabulary without an owner degrades within months. Minimum viable process:

- **One named custodian** in the department holds edit rights. Nobody else writes to the catalogue.
- **Requests, not edits.** Anyone can request a new concept through a simple form capturing: proposed FSN, why an existing concept doesn't fit, and an example case.
- **Batch review** at a fixed interval — monthly is realistic — rather than ad hoc additions.
- **Duplicate check is the main job.** Before minting, search synonyms aggressively. Most requests are an existing concept the requester couldn't find, which is a synonym problem, not a catalogue gap.
- **Release versioning.** Publish `v2026.1`, `v2026.2`, and record which release each operative note was coded against.

The single most common failure mode is allowing free-text entry as a fallback "for now". Free text becomes permanent. If a concept genuinely doesn't exist, record the closest one plus a structured free-text `note`, and flag the record for the custodian's review queue.

---

## 9. Migration path

When Maldives joins SNOMED International, or the department obtains an MLDS affiliate licence:

1. Populate `concept_map` fully against a fixed SNOMED release.
2. Stand up **Snowstorm** (SNOMED International's open-source terminology server) and expose the FHIR terminology API to the application.
3. Switch the application's lookup layer to query SNOMED, retaining local IDs as the internal primary key.
4. Historical records need no migration — they resolve through `concept_map`.
5. Where local concepts have no SNOMED equivalent, apply for a SNOMED namespace identifier and author them as a national extension.

Local identifiers should remain the internal primary key permanently, even after migration. They are stable, under your control, and independent of SNOMED release cycles.

---

## 10. Interim alternative: the Global Patient Set

If mapping is wanted before any licence is obtained, the SNOMED Global Patient Set is available free under CC BY-ND 4.0 and requires no affiliate licence. It supplies concept identifiers, fully specified names, preferred terms and active/inactive flags — but **not** relationships or hierarchies, so subsumption queries and ECL are unavailable. It is sufficient for populating `concept_map.target_code` and treating the identifiers as opaque codes; it is not sufficient for building the pick-list dynamically.
