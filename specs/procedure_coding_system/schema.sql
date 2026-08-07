-- =====================================================================
-- IGMH Neurosurgery Procedure Coding System (NSPC)
-- SQLite DDL — v0.2
--
-- Design notes:
--   * Rows are appended, not updated in place. Inactivate via `active`.
--   * Local IDs are opaque and permanent. Never reuse, never re-mean.
--   * Laterality / priority / revision / spinal level live on
--     procedure_performed, NOT in the catalogue.
--   * Translates directly to PocketBase collections; the versioning
--     columns are the part worth keeping if you port it.
-- =====================================================================

PRAGMA foreign_keys = ON;


-- ---------------------------------------------------------------------
-- Facet vocabularies
-- Each facet value is a mapping target in its own right. Map these
-- first — there are ~120 of them versus ~1000 eventual concepts.
-- ---------------------------------------------------------------------

CREATE TABLE facet (
    facet_id            TEXT PRIMARY KEY,   -- 'method','site','approach','device','morphology','intent'
    label               TEXT NOT NULL,
    snomed_attribute    TEXT,               -- e.g. 'Method', 'Procedure site - Direct'
    description         TEXT
);

CREATE TABLE facet_value (
    facet_value_id      TEXT PRIMARY KEY,   -- 'MTH-0001', 'SIT-0014'
    facet_id            TEXT NOT NULL REFERENCES facet(facet_id),
    term                TEXT NOT NULL,
    parent_id           TEXT REFERENCES facet_value(facet_value_id),  -- shallow local hierarchy
    active              INTEGER NOT NULL DEFAULT 1,
    effective_from      TEXT NOT NULL,
    effective_to        TEXT,
    UNIQUE (facet_id, term, effective_from)
);

CREATE INDEX idx_facet_value_facet ON facet_value(facet_id, active);


-- ---------------------------------------------------------------------
-- Spinal level vocabulary  (spec §5.1)
--
-- NOT a facet. Facets define what a concept IS and are fixed for the
-- concept; level varies per operation, so it is applied at the encounter
-- via procedure_performed_level.
--
-- Two kinds, and the distinction is load-bearing:
--   interspace  ISP-*  'C5-C6'  — disc space / neural foramen
--   vertebra    VRT-*  'L4'     — bone, or one end of a construct
--
-- `ordinal` exists because alphabetical sorting of level codes is wrong:
-- T2 precedes T10 anatomically and follows it lexically. Always ORDER BY
-- ordinal, never by code.
-- ---------------------------------------------------------------------

CREATE TABLE spinal_level (
    spinal_level_id     TEXT PRIMARY KEY,   -- 'ISP-0015', 'VRT-0021'
    kind                TEXT NOT NULL,      -- interspace|vertebra
    code                TEXT NOT NULL,      -- 'C5-C6', 'L4', 'Occiput' — UI display
    long_name           TEXT NOT NULL,      -- 'C5-C6 intervertebral level'
    region              TEXT NOT NULL,      -- craniocervical|cervical|cervicothoracic|
                                            -- thoracic|thoracolumbar|lumbar|lumbosacral|sacral
    ordinal             INTEGER NOT NULL,   -- cranio-caudal sort key within kind
    active              INTEGER NOT NULL DEFAULT 1,
    effective_from      TEXT NOT NULL,
    effective_to        TEXT,
    CHECK (kind IN ('interspace','vertebra')),
    UNIQUE (kind, code, effective_from)
);

CREATE INDEX idx_spinal_level_kind ON spinal_level(kind, ordinal);
CREATE INDEX idx_spinal_level_region ON spinal_level(region, active);


-- Levels have stable SNOMED concepts, so this is cheap to populate and
-- makes every spine concept's post-coordinated expression mechanical.
-- Same shape as facet_value_map. Ships EMPTY.
CREATE TABLE spinal_level_map (
    map_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    spinal_level_id     TEXT NOT NULL REFERENCES spinal_level(spinal_level_id),
    target_system       TEXT NOT NULL,
    target_code         TEXT NOT NULL,
    target_term         TEXT,
    correlation         TEXT NOT NULL,
    source_release      TEXT NOT NULL,
    active              INTEGER NOT NULL DEFAULT 1,
    effective_from      TEXT NOT NULL
);


-- ---------------------------------------------------------------------
-- Procedure catalogue
-- ---------------------------------------------------------------------

CREATE TABLE procedure_concept (
    concept_id          TEXT PRIMARY KEY,   -- 'NSX-00042' — opaque, permanent
    fsn                 TEXT NOT NULL,      -- '... (procedure)' — no laterality/urgency/revision
    preferred_term      TEXT NOT NULL,      -- UI display
    subspecialty        TEXT NOT NULL,      -- cranial-trauma, spine-degenerative, ...

    -- Faceted definition (mirrors SNOMED CT Procedure concept model)
    method_id           TEXT REFERENCES facet_value(facet_value_id),
    site_id             TEXT REFERENCES facet_value(facet_value_id),
    approach_id         TEXT REFERENCES facet_value(facet_value_id),
    device_id           TEXT REFERENCES facet_value(facet_value_id),
    morphology_id       TEXT REFERENCES facet_value(facet_value_id),
    default_intent_id   TEXT REFERENCES facet_value(facet_value_id),

    -- Which post-coordination slots are meaningful for this concept
    laterality_applicable   INTEGER NOT NULL DEFAULT 1,
    revision_applicable     INTEGER NOT NULL DEFAULT 1,

    -- Spinal level applicability (spec §5.1). 0 for every cranial concept.
    -- level_kind says which vocabulary the procedure draws from — it is a
    -- property of the procedure, not a choice offered to the user: a
    -- discectomy is always at an interspace, a corpectomy always at a
    -- vertebra.
    level_applicable        INTEGER NOT NULL DEFAULT 0,
    level_kind              TEXT,           -- interspace|vertebra, NULL when not applicable
    level_regions           TEXT,           -- comma-separated region hint for the picker,
                                            -- e.g. 'lumbar,lumbosacral'. Soft warning, not
                                            -- a hard constraint.

    -- Lifecycle
    active              INTEGER NOT NULL DEFAULT 1,
    inactivation_reason TEXT,               -- 'duplicate','ambiguous','erroneous','outdated'
    replaced_by         TEXT REFERENCES procedure_concept(concept_id),
    effective_from      TEXT NOT NULL,
    effective_to        TEXT,

    -- Provenance
    created_by          TEXT,
    approved_by         TEXT,
    catalogue_release   TEXT NOT NULL,      -- 'v2026.1'

    CHECK (level_kind IS NULL OR level_kind IN ('interspace','vertebra')),
    -- A concept that takes a level must say which kind, and one that
    -- doesn't must not claim one.
    CHECK ((level_applicable = 1) = (level_kind IS NOT NULL))
);

CREATE INDEX idx_concept_subspecialty ON procedure_concept(subspecialty, active);
CREATE INDEX idx_concept_active       ON procedure_concept(active);


-- Synonyms exist so search works. Department jargon belongs here:
-- 'crani', 'VP shunt', 'ACDF', 'MVD', 'chronic SDH'.
CREATE TABLE concept_synonym (
    synonym_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    concept_id          TEXT NOT NULL REFERENCES procedure_concept(concept_id),
    term                TEXT NOT NULL,
    language            TEXT NOT NULL DEFAULT 'en',   -- 'dv' for Dhivehi
    is_abbreviation     INTEGER NOT NULL DEFAULT 0,
    active              INTEGER NOT NULL DEFAULT 1,
    effective_from      TEXT NOT NULL
);

CREATE INDEX idx_synonym_term    ON concept_synonym(term COLLATE NOCASE, active);
CREATE INDEX idx_synonym_concept ON concept_synonym(concept_id);

-- Full-text search over FSN + PT + synonyms.
CREATE VIRTUAL TABLE concept_search USING fts5(
    concept_id UNINDEXED,
    searchable_text,
    tokenize = 'porter unicode61'
);


-- ---------------------------------------------------------------------
-- Mapping to external terminologies
-- Ships EMPTY. Populate against a real SNOMED release — never from
-- memory. A wrong concept identifier fails silently and propagates.
-- ---------------------------------------------------------------------

CREATE TABLE concept_map (
    map_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    concept_id          TEXT NOT NULL REFERENCES procedure_concept(concept_id),
    target_system       TEXT NOT NULL,      -- 'SNOMEDCT','ICHI','ICD10PCS','ICD10AM'
    target_code         TEXT,               -- NULL when using map_expression
    target_term         TEXT,
    map_expression      TEXT,               -- post-coordinated SNOMED CT expression
    correlation         TEXT NOT NULL,      -- equivalent|wider|narrower|inexact|unmatched
    map_advice          TEXT,               -- what is lost or assumed in this mapping
    source_release      TEXT NOT NULL,      -- 'SNOMEDCT-INT-20260701' — mandatory
    mapped_by           TEXT,
    reviewed_by         TEXT,
    active              INTEGER NOT NULL DEFAULT 1,
    effective_from      TEXT NOT NULL,
    effective_to        TEXT,
    CHECK (target_code IS NOT NULL OR map_expression IS NOT NULL OR correlation = 'unmatched')
);

CREATE INDEX idx_map_concept ON concept_map(concept_id, target_system, active);
CREATE INDEX idx_map_target  ON concept_map(target_system, target_code);


-- Same structure for facet values — map these first.
CREATE TABLE facet_value_map (
    map_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    facet_value_id      TEXT NOT NULL REFERENCES facet_value(facet_value_id),
    target_system       TEXT NOT NULL,
    target_code         TEXT NOT NULL,
    target_term         TEXT,
    correlation         TEXT NOT NULL,
    source_release      TEXT NOT NULL,
    active              INTEGER NOT NULL DEFAULT 1,
    effective_from      TEXT NOT NULL
);


-- ---------------------------------------------------------------------
-- Clinical use: what was actually done
-- ---------------------------------------------------------------------

CREATE TABLE procedure_performed (
    performed_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id          TEXT NOT NULL,      -- FK to your patient episode
    patient_id          TEXT NOT NULL,
    concept_id          TEXT NOT NULL REFERENCES procedure_concept(concept_id),

    -- Post-coordination slots. These are why the catalogue stays small.
    laterality          TEXT,               -- left|right|bilateral|not-applicable
    priority            TEXT NOT NULL,      -- elective|urgent|emergency
    revision_status     TEXT NOT NULL DEFAULT 'primary',   -- primary|revision
    staged_sequence     INTEGER,
    intent_override     TEXT,

    is_primary_procedure INTEGER NOT NULL DEFAULT 1,

    -- Immutable snapshot for medico-legal rendering. spinal_levels_snapshot
    -- is the rendered list ('C4-C5, C5-C6') — the structured rows in
    -- procedure_performed_level are what audit queries; this is what the
    -- operative note prints, and it must survive later vocabulary revisions.
    display_term_snapshot TEXT NOT NULL,
    spinal_levels_snapshot TEXT,
    catalogue_release     TEXT NOT NULL,

    performed_date      TEXT NOT NULL,
    primary_surgeon     TEXT,
    note                TEXT,               -- structured free text, NOT a coding fallback
    needs_review        INTEGER NOT NULL DEFAULT 0,   -- flags coding gaps for the custodian

    recorded_by         TEXT NOT NULL,
    recorded_at         TEXT NOT NULL,

    CHECK (laterality IN ('left','right','bilateral','not-applicable')),
    CHECK (priority IN ('elective','urgent','emergency')),
    CHECK (revision_status IN ('primary','revision'))
);

CREATE INDEX idx_performed_episode ON procedure_performed(episode_id);
CREATE INDEX idx_performed_patient ON procedure_performed(patient_id, performed_date);
CREATE INDEX idx_performed_concept ON procedure_performed(concept_id, performed_date);
CREATE INDEX idx_performed_review  ON procedure_performed(needs_review) WHERE needs_review = 1;


-- Spinal levels for one operation. An ordered set — a two-level ACDF is
-- ONE procedure_performed row with two rows here, not two operations and
-- not a different concept. Level count is COUNT(*) over this table and is
-- never stored anywhere.
--
-- idx_performed_level_lookup is the one that earns its keep: 'every
-- L4-L5 case in 2026' is the query the department actually wants, and it
-- is only answerable because the level is structured rather than sitting
-- inside a procedure name.
CREATE TABLE procedure_performed_level (
    performed_id        INTEGER NOT NULL REFERENCES procedure_performed(performed_id),
    spinal_level_id     TEXT NOT NULL REFERENCES spinal_level(spinal_level_id),
    sequence            INTEGER NOT NULL,   -- cranio-caudal position, 1-based
    PRIMARY KEY (performed_id, spinal_level_id)
);

CREATE INDEX idx_performed_level_lookup ON procedure_performed_level(spinal_level_id);


-- ---------------------------------------------------------------------
-- Governance: requests for new concepts
-- ---------------------------------------------------------------------

CREATE TABLE concept_request (
    request_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    proposed_fsn        TEXT NOT NULL,
    rationale           TEXT NOT NULL,      -- why existing concepts don't fit
    example_case        TEXT,
    requested_by        TEXT NOT NULL,
    requested_at        TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected|duplicate
    resolution_note     TEXT,
    resulting_concept_id TEXT REFERENCES procedure_concept(concept_id),
    reviewed_by         TEXT,
    reviewed_at         TEXT
);


-- ---------------------------------------------------------------------
-- Convenience view: current active catalogue with facets resolved
-- ---------------------------------------------------------------------

CREATE VIEW v_active_catalogue AS
SELECT
    pc.concept_id,
    pc.fsn,
    pc.preferred_term,
    pc.subspecialty,
    m.term  AS method,
    s.term  AS procedure_site,
    a.term  AS surgical_approach,
    d.term  AS device,
    mo.term AS morphology,
    pc.laterality_applicable,
    pc.revision_applicable,
    pc.level_applicable,
    pc.level_kind,
    pc.level_regions,
    (SELECT COUNT(*) FROM concept_map cm
      WHERE cm.concept_id = pc.concept_id
        AND cm.target_system = 'SNOMEDCT'
        AND cm.active = 1) AS snomed_mapped
FROM procedure_concept pc
LEFT JOIN facet_value m  ON pc.method_id     = m.facet_value_id
LEFT JOIN facet_value s  ON pc.site_id       = s.facet_value_id
LEFT JOIN facet_value a  ON pc.approach_id   = a.facet_value_id
LEFT JOIN facet_value d  ON pc.device_id     = d.facet_value_id
LEFT JOIN facet_value mo ON pc.morphology_id = mo.facet_value_id
WHERE pc.active = 1;


-- ---------------------------------------------------------------------
-- Convenience view: performed procedures with levels rendered and
-- counted. This is what replaced the 'single level' / 'multilevel'
-- catalogue concepts retired in v2026.3 — the distinction is a COUNT,
-- not a concept.
-- ---------------------------------------------------------------------

CREATE VIEW v_performed_with_levels AS
SELECT
    pp.performed_id,
    pp.episode_id,
    pp.patient_id,
    pp.concept_id,
    pp.display_term_snapshot,
    pp.laterality,
    pp.priority,
    pp.revision_status,
    pp.performed_date,
    (SELECT COUNT(*) FROM procedure_performed_level ppl
      WHERE ppl.performed_id = pp.performed_id) AS level_count,
    (SELECT GROUP_CONCAT(sl.code, ', ')
       FROM (SELECT ppl2.performed_id, sl2.code
               FROM procedure_performed_level ppl2
               JOIN spinal_level sl2 ON sl2.spinal_level_id = ppl2.spinal_level_id
              WHERE ppl2.performed_id = pp.performed_id
              ORDER BY ppl2.sequence) sl) AS levels_rendered
FROM procedure_performed pp;
