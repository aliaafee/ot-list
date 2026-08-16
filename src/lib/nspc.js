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

/** Numbers in a release label, "v2026.10" -> [2026, 10]. */
function releaseParts(release) {
    return (release.match(/\d+/g) ?? []).map(Number);
}

/** Older < newer, comparing segment by segment as numbers. */
function compareReleases(left, right) {
    const a = releaseParts(left);
    const b = releaseParts(right);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const difference = (a[i] ?? 0) - (b[i] ?? 0);
        if (difference !== 0) return difference;
    }
    // Same numbers - fall back to text so labels that carry no digits, or
    // differ only in wording, still order deterministically.
    return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * The release the catalogue in hand is at.
 *
 * `catalogueRelease` is stamped per concept - the release that concept
 * last changed in - so the catalogue's release is the newest of them,
 * not whichever concept happens to sort first. Compared numerically:
 * "v2026.10" is newer than "v2026.2", which a plain string compare gets
 * backwards.
 */
export function latestCatalogueRelease(concepts) {
    let latest = "";
    for (const concept of concepts) {
        const release = concept.catalogueRelease;
        if (release && (!latest || compareReleases(release, latest) > 0)) {
            latest = release;
        }
    }
    return latest;
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
    endovascular: "Endovascular / neurointervention",
    pain: "Interventional pain",
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
    "endovascular",
    "pain",
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

    // Which region a level belongs to, so a level typed into a search
    // query can be checked against the regions a concept plausibly
    // covers - see searchWithQualifiers.
    const regions = Object.fromEntries(
        levels.map((l) => [`${l.kind}:${l.code}`, l.region]),
    );

    return { byKind, ordinals, regions, all: levels };
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

// Laterality is an encounter qualifier too, and surgeons type it the
// same way they type a level - in front of the procedure. "Right CTR"
// is one concept, not a right-sided one, so the side is stripped before
// searching rather than looked for in the catalogue.
// The optional "sided" is what makes "right-sided craniotomy" work:
// without it the side comes off and the hyphen stays behind, leaving
// "-sided craniotomy" to search for.
const LATERALITY_QUERY =
    /^(left|right|bilateral|lt|rt|bilat|b\/l)\b(?:[\s-]*sided)?[\s.:-]*/;

/** Shorthand as typed -> the value stored on a coded procedure. */
const LATERALITY_TERMS = {
    left: "left",
    lt: "left",
    right: "right",
    rt: "right",
    bilateral: "bilateral",
    bilat: "bilateral",
    "b/l": "bilateral",
};

/**
 * Pulls a leading side off a query. "rt ctr" yields { rest: "ctr",
 * laterality: "right" }; null when the query doesn't start with one.
 */
export function extractLateralityFromQuery(query) {
    const matched = query.match(LATERALITY_QUERY);
    if (!matched) return null;
    return {
        rest: query.slice(matched[0].length),
        laterality: LATERALITY_TERMS[matched[1]],
    };
}

/**
 * Pushes concepts the typed level contradicts to the end of the results.
 *
 * `L4-L5 fusion` finding *Anterior cervical corpectomy and fusion* is
 * not a harmless mis-sort: the level prefill is rejected afterwards, so
 * the wrong concept is offered at the top of the list with nothing to
 * signal it, which is a silent mis-coding path.
 *
 * Demoted, never hidden. `levelRegions` is a picker hint and not a hard
 * constraint (spec section 5.1) - thoracic discs do get approached in
 * ways the catalogue didn't anticipate - so a concept that disagrees
 * with the typed region has to stay reachable. Only concepts that
 * positively contradict it move; a concept with no regions declared, or
 * one that takes no level at all, keeps its place.
 *
 * Note this compares regions, not `levelKind`: `L4-L5 laminectomy`
 * parses as an interspace while a laminectomy takes vertebrae, and per
 * section 5.1 that query means the laminae of L4 and L5 - a real search
 * that a kind check would wrongly reject.
 */
function demoteImplausibleRegions(results, extracted, lookup) {
    const kind = extracted.interspace ? "interspace" : "vertebra";
    const code = extracted.interspace ?? extracted.vertebra;
    const region = lookup?.regions?.[`${kind}:${code}`];

    // "C8-T1" parses but is not a level anyone can record, and carries
    // no region to judge anything against.
    if (!region) return results;

    const contradicts = (concept) =>
        concept.levelApplicable &&
        concept.levelRegions?.length > 0 &&
        !concept.levelRegions.includes(region);

    const plausible = results.filter((c) => !contradicts(c));
    if (plausible.length === results.length) return results;
    return [...plausible, ...results.filter(contradicts)];
}

/**
 * Search with a qualifier-aware fallback. The query as typed always
 * wins; only when it finds nothing are the encounter qualifiers a
 * surgeon types in front of a procedure - a side, a spinal level -
 * stripped and the remainder searched. So "C5-C6 ACDF" finds the ACDF
 * concept and "Right CTR" finds carpal tunnel decompression (neither
 * levels nor sides are in the catalogue, so the literal query cannot
 * match), while an ordinary search is never shadowed by either pattern.
 *
 * Both are stripped together, since "Right L4-L5 TFESI" carries both,
 * and both are handed back so what was typed can pre-fill the slot it
 * belongs in rather than being thrown away - see buildValueFromConcept.
 *
 * @returns {{results: Object[], queryLevel: Object|null,
 *   queryLaterality: string|null}}
 */
export function searchWithQualifiers(index, lookup, query) {
    const results = searchConcepts(index, query);
    if (results.length > 0) {
        return { results, queryLevel: null, queryLaterality: null };
    }

    const typed = query.trim().toLowerCase();
    const side = extractLateralityFromQuery(typed);
    const withoutSide = side ? side.rest : typed;
    const extracted = extractLevelFromQuery(withoutSide);
    const rest = extracted ? extracted.rest : withoutSide;

    // Nothing came off, or nothing is left: either way there is no
    // second query to run that the first one hasn't already tried.
    if (!rest || rest === typed) {
        return { results, queryLevel: null, queryLaterality: null };
    }

    const fallback = searchConcepts(index, rest);
    return {
        results: extracted
            ? demoteImplausibleRegions(fallback, extracted, lookup)
            : fallback,
        queryLevel: extracted ?? null,
        queryLaterality: side?.laterality ?? null,
    };
}

// ---------------------------------------------------------------------
// Browser tree
//
// Shared by ProcedureCatalogueBrowser (the modal and the procedure-codes
// page both render it) - there is no explicit hierarchy table, so the
// browser's three levels are derived here from fields every concept
// already carries. Nothing extra to keep in sync.
// ---------------------------------------------------------------------

/**
 * Groups concepts into subspecialty -> procedure site -> concepts.
 *
 * Retired concepts are left out: the picker exists to code today's
 * operations, and a code nobody may choose has no business being
 * offered. `includeInactive` is for the catalogue-authoring page, which
 * has to show what it is about to retire - and what earlier releases
 * already did - rather than only what is choosable.
 */
export function buildProcedureTree(concepts, { includeInactive = false } = {}) {
    const bySubspecialty = new Map();

    for (const concept of concepts) {
        if (!concept.active && !includeInactive) continue;

        const site = concept.facets?.procedureSite || "Other";
        if (!bySubspecialty.has(concept.subspecialty)) {
            bySubspecialty.set(concept.subspecialty, new Map());
        }
        const bySite = bySubspecialty.get(concept.subspecialty);
        if (!bySite.has(site)) bySite.set(site, []);
        bySite.get(site).push(concept);
    }

    // Anything the catalogue grows that the fixed order doesn't know
    // about still renders, just at the end.
    const order = [
        ...SUBSPECIALTY_ORDER,
        ...[...bySubspecialty.keys()].filter(
            (key) => !SUBSPECIALTY_ORDER.includes(key),
        ),
    ];

    return order
        .filter((key) => bySubspecialty.has(key))
        .map((subspecialty) => {
            const sites = [...bySubspecialty.get(subspecialty).entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([site, siteConcepts]) => ({
                    site,
                    concepts: [...siteConcepts].sort((a, b) =>
                        a.preferredTerm.localeCompare(b.preferredTerm),
                    ),
                }));
            const count = sites.reduce((n, s) => n + s.concepts.length, 0);
            return { subspecialty, sites, count };
        });
}

/** True when a concept matches a free-text filter (name, FSN, synonyms). */
export function matchesProcedureFilter(concept, filterLower) {
    if (!filterLower) return true;
    if (concept.preferredTerm.toLowerCase().includes(filterLower)) return true;
    if (concept.fsn.toLowerCase().includes(filterLower)) return true;
    return concept.synonyms.some(
        (s) => s.active && s.term.toLowerCase().includes(filterLower),
    );
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
 * Qualifiers the search query itself carried win over whatever the
 * previous value had: someone who types "Right L4-L5 TFESI" has already
 * said which side and which level, and being made to pick them again
 * from the dropdown is the search having quietly discarded half of what
 * they typed.
 *
 * @param {Object} typed - What the query carried, from
 *   searchWithQualifiers: `{ levels?: string[], laterality?: string }`.
 *   Empty for a pick that wasn't derived from typing, e.g. the browser
 *   modal.
 */
export function buildValueFromConcept(lookup, concept, previous, typed = {}) {
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
            ? (typed.laterality ??
              (isCoded(previous) ? previous.laterality : ""))
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
                  typed.levels ?? carriedLevels,
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

/**
 * The NSPC concept id for a procedure record, or null if it is uncoded.
 *
 * Unlike the name, the concept id isn't a snapshot on the `procedureCodes`
 * row itself - that row only holds a relation to `procedureConcepts` - so
 * this needs `concept` expanded one level further than `procedureName`
 * does. The `NSX-00000` sentinel is collapsed to null here rather than
 * handed back as a concept id, since an uncoded procedure has none.
 *
 * Requires `procedureCodes_via_procedure.concept` to have been expanded.
 * Missing that, this returns null.
 */
export function procedureConceptId(procedure) {
    const conceptId =
        procedure?.expand?.procedureCodes_via_procedure?.[0]?.expand?.concept
            ?.conceptId;
    return conceptId && conceptId !== UNCODED_CONCEPT_ID ? conceptId : null;
}
