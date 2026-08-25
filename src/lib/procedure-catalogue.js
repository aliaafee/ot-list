import bundledCatalogue from "@/data/nspc-catalogue.json";
import bundledLevels from "@/data/spinal-levels.json";

export const FACET_LABELS = {
    method: "Method",
    procedureSite: "Site",
    surgicalApproach: "Approach",
    device: "Device",
    morphology: "Morphology",
    intent: "Intent",
};

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

export const LEVEL_KIND_LABELS = {
    interspace: "interspace",
    vertebra: "vertebral level",
};

export async function fetchCatalogue() {
    return {
        concepts: bundledCatalogue,
        levels: bundledLevels,
    };
}

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

export function searchCatalogue(index, query) {
    const results = searchConcepts(index, query);

    return results;
}

// Matches a level written the way surgeons type it, so "c5-c6 acdf" and
// "l4/5 microdisc" both work. Only consulted when the query as typed
// finds nothing, so this can never shadow an ordinary search.
const INTERSPACE_QUERY =
    /\b([cCtTlLsS]\d{1,2})\s*[-–/]\s*([cCtTlLsS]?\d{1,2})\b/;
const VERTEBRA_QUERY =
    /\b([cC][1-7]|[tT](?:1[0-2]|[1-9])|[lL][1-5]|[sS][12]|occiput)\b/;

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

/** Halves of an interspace code the vertebra vocabulary spells differently. */
const VERTEBRA_ALIASES = { C0: "Occiput" };

/**
 * The two vertebrae an interspace lies between.
 *
 * "L4-L5 laminectomy" names the laminae of L4 and L5 (spec section 5.1), so
 * an interspace typed at a concept that records vertebrae has to expand into
 * the bodies it sits between rather than be thrown away. The halves of the
 * code are those bodies, bar the one the catalogue spells differently: the
 * C0 of "C0-C1" is the occiput.
 *
 * Both halves or neither. Half an interspace records less than was typed,
 * and a level naming one body when the surgeon meant two is worse than an
 * empty slot they can still fill themselves.
 */
export function interspaceVertebrae(levels, code) {
    const isVertebra = (c) =>
        levels.some((l) => l.kind === "vertebra" && l.code === c && l.active);

    const bounds = String(code ?? "")
        .split("-")
        .map((half) => VERTEBRA_ALIASES[half] ?? half);

    return bounds.length === 2 && bounds.every(isVertebra) ? bounds : [];
}

/** Sort selected level codes cranio-caudally. */
export function sortLevelCodes(lookup, codes, kind) {
    return [...codes].sort(
        (a, b) =>
            (lookup.ordinals[`${kind}:${a}`] ?? 0) -
            (lookup.ordinals[`${kind}:${b}`] ?? 0),
    );
}
