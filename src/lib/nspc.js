/**
 * NSPC catalogue logic - search, spinal levels, and building the value a
 * coded procedure is stored as.
 *
 * Every function here takes its data as an argument rather than importing
 * it. The catalogue is fetched from PocketBase at runtime and can change
 * under the app, so nothing may capture it at module scope. The
 * catalogue context binds these into a ready-to-use API; see
 * `useCatalogue`.
 */

/**
 * The sentinel concept a free-text procedure is coded against, so that
 * "not coded" is a row in `procedureCodes` rather than the absence of
 * one, and the custodian's backlog is a query instead of a guess. See
 * spec section 8, "The uncoded sentinel".
 *
 * Never offered in the picker - the system assigns it when the user
 * selected nothing, and a sentinel anyone can pick on purpose stops
 * measuring what it exists to measure.
 */
export const UNCODED_CONCEPT_ID = "NSX-00000";

/** Concepts a user may actually search for or browse to. */
export function selectableConcepts(concepts) {
    return concepts.filter((c) => c.conceptId !== UNCODED_CONCEPT_ID);
}

export const INTENT_OPTIONS = [
    "Therapeutic",
    "Diagnostic",
    "Palliative",
    "Prophylactic",
];

export const LATERALITY_OPTIONS = [
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
    { value: "bilateral", label: "Bilateral" },
    { value: "not-applicable", label: "Not applicable" },
];

export const PRIORITY_OPTIONS = [
    { value: "elective", label: "Elective" },
    { value: "urgent", label: "Urgent" },
    { value: "emergency", label: "Emergency" },
];

export const REVISION_OPTIONS = [
    { value: "primary", label: "Primary" },
    { value: "revision", label: "Revision" },
];

export const ALL_POST_COORDINATION_FIELDS = [
    "priority",
    "laterality",
    "revisionStatus",
    "stagedSequence",
    "intentOverride",
    "spinalLevels",
];

export const FACET_LABELS = {
    method: "Method",
    procedureSite: "Site",
    surgicalApproach: "Approach",
    device: "Device",
    morphology: "Morphology",
    intent: "Intent",
};

export const LEVEL_KIND_LABELS = {
    interspace: "interspace",
    vertebra: "vertebral level",
};

export const SUBSPECIALTY_LABELS = {
    "cranial-trauma": "Cranial - Trauma",
    "cranial-csf": "Cranial - CSF disorders",
    "cranial-tumour": "Cranial - Tumour",
    "cranial-vascular": "Cranial - Vascular",
    "cranial-infection": "Cranial - Infection",
    "spine-degenerative": "Spine - Degenerative",
    "spine-trauma": "Spine - Trauma",
    "spine-tumour": "Spine - Tumour",
    "spine-infection": "Spine - Infection",
    paediatric: "Paediatric",
    "peripheral-nerve": "Peripheral nerve",
};

// Clinical grouping order rather than alphabetical - cranial, then
// spine, then the cross-cutting subspecialties, which is how a surgeon
// scans the list.
export const SUBSPECIALTY_ORDER = [
    "cranial-trauma",
    "cranial-csf",
    "cranial-tumour",
    "cranial-vascular",
    "cranial-infection",
    "spine-degenerative",
    "spine-trauma",
    "spine-tumour",
    "spine-infection",
    "paediatric",
    "peripheral-nerve",
];

// ---------------------------------------------------------------------
// Search index
//
// Per the NSPC spec (search hits a synonym, the system stores the
// concept ID), matching runs over the FSN, preferred term and every
// synonym - department jargon like "VP shunt" or "crani" lives in
// synonyms, not in the formal name, so it has to be searched too.
// ---------------------------------------------------------------------

export function buildSearchIndex(concepts) {
    return concepts
        .filter((concept) => concept.active)
        .map((concept) => ({
            concept,
            preferredTermLower: concept.preferredTerm.toLowerCase(),
            fsnLower: concept.fsn.toLowerCase(),
            subspecialtyLower: concept.subspecialty.toLowerCase(),
            synonymsLower: concept.synonyms
                .filter((s) => s.active)
                .map((s) => s.term.toLowerCase()),
        }));
}

/** Score one index entry against a query. Lower is better. Null = no match. */
function scoreEntry(entry, queryLower, tokens) {
    if (entry.preferredTermLower === queryLower) return 0;
    if (entry.synonymsLower.includes(queryLower)) return 1;
    if (entry.preferredTermLower.startsWith(queryLower)) return 2;
    if (entry.synonymsLower.some((s) => s.startsWith(queryLower))) return 3;
    if (entry.preferredTermLower.includes(queryLower)) return 4;
    if (entry.synonymsLower.some((s) => s.includes(queryLower))) return 5;
    if (entry.fsnLower.includes(queryLower)) return 6;

    // Multi-word query: fall back to "every token appears somewhere",
    // which is what makes "vp shunt insertion" find a concept whose
    // preferred term and synonyms only cover the phrase between them.
    if (tokens.length > 1) {
        const haystack = [
            entry.preferredTermLower,
            entry.fsnLower,
            entry.subspecialtyLower,
            ...entry.synonymsLower,
        ].join(" | ");
        if (tokens.every((t) => haystack.includes(t))) return 7;
    }

    return null;
}

export function searchConcepts(index, query, limit = 20) {
    const queryLower = query.trim().toLowerCase();
    if (!queryLower) return [];

    const tokens = queryLower.split(/\s+/).filter(Boolean);

    const matched = [];
    for (const entry of index) {
        const score = scoreEntry(entry, queryLower, tokens);
        if (score !== null) matched.push({ entry, score });
    }

    matched.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.entry.preferredTermLower.localeCompare(
            b.entry.preferredTermLower,
        );
    });

    return matched.slice(0, limit).map((m) => m.entry.concept);
}

// ---------------------------------------------------------------------
// Spinal levels (NSPC spec section 5.1)
//
// Level is an encounter qualifier, exactly like laterality - it is never
// part of the concept. A concept declares which vocabulary it draws from
// (`levelKind`: an interspace for disc/foramen work, a vertebra for bone
// work) and which regions are plausible (`levelRegions`, a picker hint,
// not a hard constraint).
//
// Everything here orders by `ordinal`, never by code: T2 precedes T10
// anatomically and follows it lexically.
// ---------------------------------------------------------------------

export function buildLevelLookup(levels) {
    const byKind = {
        interspace: levels
            .filter((l) => l.kind === "interspace" && l.active)
            .sort((a, b) => a.ordinal - b.ordinal),
        vertebra: levels
            .filter((l) => l.kind === "vertebra" && l.active)
            .sort((a, b) => a.ordinal - b.ordinal),
    };

    const ordinals = Object.fromEntries(
        levels.map((l) => [`${l.kind}:${l.code}`, l.ordinal]),
    );

    return { byKind, ordinals, all: levels };
}

/** Levels a concept can take, narrowed to its regions unless `all`. */
export function levelOptions(lookup, concept, all) {
    const options = lookup.byKind[concept?.levelKind] ?? [];
    const regions = concept?.levelRegions ?? [];
    if (all || regions.length === 0) return options;
    return options.filter((l) => regions.includes(l.region));
}

/** Sort selected level codes cranio-caudally. */
export function sortLevelCodes(lookup, codes, kind) {
    return [...codes].sort(
        (a, b) =>
            (lookup.ordinals[`${kind}:${a}`] ?? 0) -
            (lookup.ordinals[`${kind}:${b}`] ?? 0),
    );
}

// Matches a level written the way surgeons type it, so "c5-c6 acdf" and
// "l4/5 microdisc" both work. Only consulted when the query as typed
// finds nothing, so this can never shadow an ordinary search.
const INTERSPACE_QUERY =
    /\b([cCtTlLsS]\d{1,2})\s*[-–/]\s*([cCtTlLsS]?\d{1,2})\b/;
const VERTEBRA_QUERY =
    /\b([cC][1-7]|[tT](?:1[0-2]|[1-9])|[lL][1-5]|[sS][12]|occiput)\b/;

/**
 * Pulls a level out of a search query, returning the remaining text and
 * the canonical level code. "l4/5 microdisc" yields { rest: "microdisc",
 * interspace: "L4-L5" } - the shorthand second half ("5") is expanded
 * using the first half's region letter.
 */
export function extractLevelFromQuery(query) {
    const interspace = query.match(INTERSPACE_QUERY);
    if (interspace) {
        const [matched, from, toRaw] = interspace;
        const to = /^\d/.test(toRaw) ? from[0].toUpperCase() + toRaw : toRaw;
        return {
            rest: query.replace(matched, " ").trim(),
            interspace: `${from.toUpperCase()}-${to.toUpperCase()}`,
        };
    }
    const vertebra = query.match(VERTEBRA_QUERY);
    if (vertebra) {
        const code = vertebra[1];
        return {
            rest: query.replace(vertebra[0], " ").trim(),
            vertebra:
                code.toLowerCase() === "occiput"
                    ? "Occiput"
                    : code.toUpperCase(),
        };
    }
    return null;
}

/**
 * Search with a spinal-level-aware fallback. The query as typed always
 * wins; only when it finds nothing do we strip a level token and search
 * the remainder, so "C5-C6 ACDF" finds the ACDF concept (levels are not
 * in the catalogue, so the literal query cannot match) while an ordinary
 * search is never shadowed by the level regex.
 */
export function searchWithLevel(index, query) {
    const results = searchConcepts(index, query);
    if (results.length > 0) return { results, queryLevel: null };

    const extracted = extractLevelFromQuery(query.trim().toLowerCase());
    if (!extracted?.rest) return { results, queryLevel: null };

    return {
        results: searchConcepts(index, extracted.rest),
        queryLevel: extracted,
    };
}

// ---------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------

/** True when `value` is a coded selection rather than plain free text. */
export function isCoded(value) {
    return !!value && typeof value === "object" && !!value.conceptId;
}

export function displayText(value) {
    if (isCoded(value)) return value.preferredTerm;
    return typeof value === "string" ? value : "";
}

/**
 * Builds the value emitted when a concept is picked. Concept fields are a
 * snapshot at selection time (per NSPC spec section 6, the display term
 * and catalogue release are stored, not just the ID) and the post
 * coordination fields default per section 5 - laterality, priority,
 * revision status, staged sequence, intent and spinal level are encounter
 * qualifiers, never baked into the catalogue row.
 *
 * @param {string[]} initialLevels - Level codes to start from, used when
 *   the search query itself carried a level ("C5-C6 ACDF").
 */
export function buildValueFromConcept(
    lookup,
    concept,
    previous,
    initialLevels,
) {
    // Levels only carry across a concept change when both concepts draw
    // from the same vocabulary. Switching an ACDF to a cervical
    // laminectomy must not drag "C5-C6" into a field that takes vertebrae.
    const carriedLevels =
        isCoded(previous) && previous.levelKind === concept.levelKind
            ? (previous.spinalLevels ?? [])
            : [];

    return {
        conceptId: concept.conceptId,
        fsn: concept.fsn,
        preferredTerm: concept.preferredTerm,
        displayTermSnapshot: concept.preferredTerm,
        subspecialty: concept.subspecialty,
        facets: concept.facets,
        lateralityApplicable: concept.lateralityApplicable,
        revisionApplicable: concept.revisionApplicable,
        levelApplicable: concept.levelApplicable,
        levelKind: concept.levelKind,
        levelRegions: concept.levelRegions,
        catalogueRelease: concept.catalogueRelease,
        laterality: concept.lateralityApplicable
            ? isCoded(previous)
                ? previous.laterality
                : ""
            : "not-applicable",
        priority: isCoded(previous) ? previous.priority : "",
        revisionStatus: concept.revisionApplicable
            ? isCoded(previous)
                ? previous.revisionStatus
                : "primary"
            : "primary",
        stagedSequence: isCoded(previous) ? previous.stagedSequence : "",
        intentOverride: isCoded(previous) ? previous.intentOverride : "",
        spinalLevels: concept.levelApplicable
            ? sortLevelCodes(
                  lookup,
                  initialLevels ?? carriedLevels,
                  concept.levelKind,
              )
            : [],
    };
}

/** Renders the level list the way an operative note prints it. */
export function renderLevels(codes) {
    return (codes ?? []).join(", ");
}

/**
 * Composes the one-line procedure name from its parts.
 *
 * Post-coordination is folded into the text because most readers only
 * ever see the string: a coded ACDF whose levels live in a relation would
 * otherwise print as plain "ACDF", losing what the surgeon used to type
 * by hand. Priority and staged sequence are deliberately left out - they
 * qualify the encounter, not the name of the operation.
 *
 * NOTE: mirrored by procedureName() in pb/pb_hooks/reports.js, which
 * renders the server-side printed OT list and cannot import this - it
 * runs in PocketBase's JS VM. Change both together or the print-out
 * stops matching the screen.
 */
function composeName({ term, levels, laterality, revisionStatus }) {
    const side = LATERALITY_OPTIONS.find(
        (opt) => opt.value === laterality && opt.value !== "not-applicable",
    );

    return [
        revisionStatus === "revision" && "Revision",
        term,
        levels,
        side && `(${side.label})`,
    ]
        .filter(Boolean)
        .join(" ");
}

/** The name for a value the selector is currently holding. */
export function renderProcedureText(value) {
    if (!isCoded(value)) return typeof value === "string" ? value : "";

    return composeName({
        term: value.preferredTerm,
        levels: renderLevels(value.spinalLevels),
        laterality: value.laterality,
        revisionStatus: value.revisionStatus,
    });
}

/**
 * The name for a stored `procedureCodes` row.
 *
 * Reads the snapshots rather than the related concept, which is both what
 * they are for - per spec section 6, printing the term that was on screen
 * when the record was signed - and what lets any list render a procedure
 * name without expanding the catalogue or holding it in memory. An
 * uncoded row needs no special case: its snapshot is the text the surgeon
 * typed.
 */
export function renderStoredProcedureName(record) {
    if (!record) return "";

    return composeName({
        term: record.displayTermSnapshot,
        levels: record.spinalLevelsSnapshot,
        laterality: record.laterality,
        revisionStatus: record.revisionStatus,
    });
}

/**
 * The name to display for a procedure record.
 *
 * The code row is the only source. `procedures.procedure` is neither
 * written nor read any more: every procedure has a code row - new ones
 * get theirs in the same transaction, and the backfill migration gave one
 * to every record that predated coding - so there is nothing left for a
 * fallback to catch. Reading a stale second copy would only let the two
 * disagree.
 *
 * Requires `procedureCodes_via_procedure` to have been expanded. Missing
 * that, this returns "" rather than a name, which is the visible symptom
 * of a query that forgot the expand.
 */
export function procedureName(procedure) {
    return renderStoredProcedureName(
        procedure?.expand?.procedureCodes_via_procedure?.[0],
    );
}
