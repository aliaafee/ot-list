import { describe, expect, it } from "vitest";

import levels from "@/data/spinal-levels.json";
import {
    buildLevelLookup,
    buildSearchIndex,
    extractLateralityFromQuery,
    extractLevelFromQuery,
    levelOptions,
    searchConcepts,
    searchWithQualifiers,
    sortLevelCodes,
    spannedInterspaces,
    spannedVertebrae,
} from "@/lib/procedure-catalogue";

// Section numbers are those of specs/procedure_codes/README.md. Levels are
// the published vocabulary; concepts are built here, so a catalogue release
// cannot change what these tests assert.

let nextId = 1;
const concept = (preferredTerm, over = {}) => ({
    conceptId: `NSX-9${String(nextId++).padStart(4, "0")}`,
    fsn: `${preferredTerm} (procedure)`,
    preferredTerm,
    subspecialty: "spine",
    synonyms: [],
    active: true,
    levelApplicable: false,
    levelKind: null,
    levelRegions: [],
    ...over,
});
const synonyms = (...terms) => terms.map((term) => ({ term, active: true }));

const terms = (concepts) => concepts.map((c) => c.preferredTerm);
const search = (concepts, query, limit) =>
    terms(searchConcepts(buildSearchIndex(concepts), query, limit));

describe("searchConcepts (§4.2)", () => {
    it("ranks exact, prefix and substring matches, preferred term ahead of synonym", () => {
        const concepts = [
            concept("Golf", { fsn: "Removal of shunt (procedure)" }),
            concept("Foxtrot", { synonyms: synonyms("old shunt") }),
            concept("VP shunt"),
            concept("Delta", { synonyms: synonyms("shunt tap") }),
            concept("Shunt revision"),
            concept("Bravo", { synonyms: synonyms("Shunt") }),
            concept("Shunt"),
        ];

        expect(search(concepts, "shunt")).toEqual([
            "Shunt",
            "Bravo",
            "Shunt revision",
            "Delta",
            "VP shunt",
            "Foxtrot",
            "Golf",
        ]);
    });

    it("breaks a tie alphabetically on the preferred term", () => {
        const concepts = [concept("Shunt revision"), concept("Shunt insertion")];

        expect(search(concepts, "shunt")).toEqual([
            "Shunt insertion",
            "Shunt revision",
        ]);
    });

    it("ignores case and surrounding space", () => {
        expect(search([concept("Lumbar microdiscectomy")], "  LUMBAR ")).toEqual([
            "Lumbar microdiscectomy",
        ]);
    });

    it("finds a multi-word query whose words are spread across term and synonyms", () => {
        const concepts = [
            concept("Ventriculoperitoneal shunt insertion", {
                synonyms: synonyms("VP shunt"),
            }),
            concept("Ventriculoperitoneal shunt removal", {
                synonyms: synonyms("VP shunt"),
            }),
        ];

        expect(search(concepts, "vp insertion")).toEqual([
            "Ventriculoperitoneal shunt insertion",
        ]);
    });

    it("matches a word of the subspecialty only as part of a multi-word query", () => {
        const concepts = [
            concept("Decompression", { subspecialty: "peripheral-nerve" }),
        ];

        expect(search(concepts, "peripheral")).toEqual([]);
        expect(search(concepts, "peripheral decompression")).toEqual([
            "Decompression",
        ]);
    });

    it("leaves out retired concepts and retired synonyms", () => {
        const concepts = [
            concept("Shunt insertion", { active: false }),
            concept("Bravo", {
                synonyms: [{ term: "shunt", active: false }],
            }),
        ];

        expect(search(concepts, "shunt")).toEqual([]);
    });

    it("returns nothing for a blank query", () => {
        expect(search([concept("Shunt")], "   ")).toEqual([]);
    });

    it("returns at most 20 results unless told otherwise", () => {
        const concepts = Array.from({ length: 25 }, (_, i) =>
            concept(`Alpha ${String(i).padStart(2, "0")}`),
        );

        expect(search(concepts, "alpha")).toHaveLength(20);
        expect(search(concepts, "alpha", 3)).toEqual([
            "Alpha 00",
            "Alpha 01",
            "Alpha 02",
        ]);
    });
});

describe("extractLevelFromQuery (§4.2)", () => {
    it("reads an interspace written with a hyphen or a slash", () => {
        expect(extractLevelFromQuery("c5-c6 acdf")).toEqual({
            rest: "acdf",
            interspace: "C5-C6",
        });
        expect(extractLevelFromQuery("l4/5 microdisc")).toEqual({
            rest: "microdisc",
            interspace: "L4-L5",
        });
        expect(extractLevelFromQuery("t12-l1 fusion")).toEqual({
            rest: "fusion",
            interspace: "T12-L1",
        });
    });

    it("reads the compact shorthand for adjacent levels", () => {
        expect(extractLevelFromQuery("l45 microdisc")).toEqual({
            rest: "microdisc",
            interspace: "L4-L5",
        });
        expect(extractLevelFromQuery("t1011 fixation")).toEqual({
            rest: "fixation",
            interspace: "T10-T11",
        });
    });

    it("reads l51 as the lumbosacral junction", () => {
        expect(extractLevelFromQuery("l51 discectomy")).toEqual({
            rest: "discectomy",
            interspace: "L5-S1",
        });
    });

    it("reads t12 as the vertebra, not T1-T2", () => {
        expect(extractLevelFromQuery("t12 corpectomy")).toEqual({
            rest: "corpectomy",
            vertebra: "T12",
        });
    });

    it("reads a bare vertebra, and the occiput", () => {
        expect(extractLevelFromQuery("c5 corpectomy")).toEqual({
            rest: "corpectomy",
            vertebra: "C5",
        });
        expect(extractLevelFromQuery("occiput fixation")).toEqual({
            rest: "fixation",
            vertebra: "Occiput",
        });
    });

    it("takes a level from the end of the query as well as the start", () => {
        expect(extractLevelFromQuery("acdf c5-c6")).toEqual({
            rest: "acdf",
            interspace: "C5-C6",
        });
    });

    it("does not read digits that are not adjacent levels as a level", () => {
        expect(extractLevelFromQuery("l47 something")).toBeNull();
    });

    it("finds nothing in a query with no level", () => {
        expect(extractLevelFromQuery("acdf")).toBeNull();
        expect(extractLevelFromQuery("craniotomy")).toBeNull();
    });
});

describe("extractLateralityFromQuery (§4.2)", () => {
    it("reads a leading side, in full or as shorthand", () => {
        expect(extractLateralityFromQuery("right ctr")).toEqual({
            rest: "ctr",
            laterality: "right",
        });
        expect(extractLateralityFromQuery("lt ctr")).toEqual({
            rest: "ctr",
            laterality: "left",
        });
        expect(extractLateralityFromQuery("b/l ctr")).toEqual({
            rest: "ctr",
            laterality: "bilateral",
        });
        expect(extractLateralityFromQuery("bilat. burr holes")).toEqual({
            rest: "burr holes",
            laterality: "bilateral",
        });
    });

    it("takes '-sided' with the side", () => {
        expect(extractLateralityFromQuery("left-sided craniotomy")).toEqual({
            rest: "craniotomy",
            laterality: "left",
        });
        expect(extractLateralityFromQuery("rt sided craniotomy")).toEqual({
            rest: "craniotomy",
            laterality: "right",
        });
    });

    it("only reads a side at the start, and only as a whole word", () => {
        expect(extractLateralityFromQuery("ctr right")).toBeNull();
        expect(extractLateralityFromQuery("leftover")).toBeNull();
        expect(extractLateralityFromQuery("ltd")).toBeNull();
    });
});

describe("searchWithQualifiers (§4.2)", () => {
    const interspaceConcept = (preferredTerm, levelRegions, over = {}) =>
        concept(preferredTerm, {
            levelApplicable: true,
            levelKind: "interspace",
            levelRegions,
            ...over,
        });

    const ACDF = interspaceConcept(
        "Anterior cervical discectomy and fusion",
        ["cervical", "cervicothoracic"],
        { synonyms: synonyms("ACDF") },
    );
    const CORPECTOMY = concept("Anterior cervical corpectomy and fusion", {
        levelApplicable: true,
        levelKind: "vertebra",
        levelRegions: ["cervical"],
    });
    const PLIF = interspaceConcept("Posterior lumbar interbody fusion", [
        "lumbar",
        "lumbosacral",
    ]);
    const MICRODISC = interspaceConcept(
        "Lumbar microdiscectomy",
        ["lumbar", "lumbosacral"],
        { synonyms: synonyms("microdisc") },
    );
    const CTR = concept("Carpal tunnel decompression", {
        subspecialty: "peripheral-nerve",
        synonyms: synonyms("CTR"),
    });

    const lookup = buildLevelLookup(levels);
    const run = (concepts, query) => {
        const found = searchWithQualifiers(
            buildSearchIndex(concepts),
            lookup,
            query,
        );
        return { ...found, results: terms(found.results) };
    };
    const ALL = [ACDF, CORPECTOMY, PLIF, MICRODISC, CTR];

    it("lets the query as typed win, with no qualifiers handed back", () => {
        expect(run(ALL, "ACDF")).toEqual({
            results: ["Anterior cervical discectomy and fusion"],
            queryLevel: null,
            queryLaterality: null,
        });
    });

    it("does not strip a qualifier the catalogue itself matches", () => {
        const concepts = [...ALL, concept("Right hemicolectomy")];

        expect(run(concepts, "right")).toEqual({
            results: ["Right hemicolectomy"],
            queryLevel: null,
            queryLaterality: null,
        });
    });

    it("strips a typed level when the literal query finds nothing", () => {
        expect(run(ALL, "C5-C6 ACDF")).toEqual({
            results: ["Anterior cervical discectomy and fusion"],
            queryLevel: { rest: "acdf", interspace: "C5-C6" },
            queryLaterality: null,
        });
    });

    it("strips a typed side when the literal query finds nothing", () => {
        expect(run(ALL, "Right CTR")).toEqual({
            results: ["Carpal tunnel decompression"],
            queryLevel: null,
            queryLaterality: "right",
        });
    });

    it("strips a side and a level together", () => {
        expect(run(ALL, "Right L4-L5 microdisc")).toEqual({
            results: ["Lumbar microdiscectomy"],
            queryLevel: { rest: "microdisc", interspace: "L4-L5" },
            queryLaterality: "right",
        });
    });

    it("moves concepts the typed region contradicts to the end, without hiding them", () => {
        const unqualified = concept("Occipitocervical fusion");

        expect(run([...ALL, unqualified], "L4-L5 fusion").results).toEqual([
            "Occipitocervical fusion",
            "Posterior lumbar interbody fusion",
            "Anterior cervical corpectomy and fusion",
            "Anterior cervical discectomy and fusion",
        ]);
    });

    it("judges a multi-level span by every region it covers", () => {
        const lumbosacral = interspaceConcept("Lumbosacral fusion", [
            "lumbosacral",
        ]);

        expect(run([ACDF, lumbosacral], "L4-S1 fusion").results).toEqual([
            "Lumbosacral fusion",
            "Anterior cervical discectomy and fusion",
        ]);
    });

    it("leaves the order alone for a level that names no region", () => {
        expect(run([ACDF, PLIF], "C8-T1 fusion").results).toEqual([
            "Anterior cervical discectomy and fusion",
            "Posterior lumbar interbody fusion",
        ]);
    });

    it("finds nothing when only a qualifier was typed", () => {
        expect(run(ALL, "c5-c6")).toEqual({
            results: [],
            queryLevel: null,
            queryLaterality: null,
        });
    });

    it("finds nothing when nothing can be stripped", () => {
        expect(run(ALL, "zzz")).toEqual({
            results: [],
            queryLevel: null,
            queryLaterality: null,
        });
    });
});

describe("spinal levels (§8)", () => {
    const lookup = buildLevelLookup(levels);
    const codes = (list) => list.map((level) => level.code);

    it("splits the vocabulary by kind, cranio-caudally", () => {
        expect(lookup.byKind.vertebra).toHaveLength(27);
        expect(lookup.byKind.interspace).toHaveLength(25);
        expect(codes(lookup.byKind.vertebra).slice(0, 3)).toEqual([
            "Occiput",
            "C1",
            "C2",
        ]);
        expect(codes(lookup.byKind.interspace).slice(-2)).toEqual([
            "L4-L5",
            "L5-S1",
        ]);
    });

    it("leaves inactive levels out of the picker's lists", () => {
        const some = buildLevelLookup([
            { kind: "vertebra", code: "L4", region: "lumbar", ordinal: 2, active: true },
            { kind: "vertebra", code: "L3", region: "lumbar", ordinal: 1, active: false },
        ]);

        expect(codes(some.byKind.vertebra)).toEqual(["L4"]);
    });

    it("offers a concept the levels of its kind, narrowed to its regions", () => {
        const lumbarDisc = {
            levelKind: "interspace",
            levelRegions: ["lumbar", "lumbosacral"],
        };

        expect(codes(levelOptions(lookup, lumbarDisc))).toEqual([
            "L1-L2",
            "L2-L3",
            "L3-L4",
            "L4-L5",
            "L5-S1",
        ]);
    });

    it("offers every level of the kind when asked, or when no regions are declared", () => {
        const lumbarDisc = { levelKind: "interspace", levelRegions: ["lumbar"] };
        const anyBone = { levelKind: "vertebra", levelRegions: [] };

        expect(levelOptions(lookup, lumbarDisc, true)).toHaveLength(25);
        expect(levelOptions(lookup, anyBone)).toHaveLength(27);
    });

    it("offers no levels to a concept that takes none", () => {
        expect(levelOptions(lookup, { levelKind: null })).toEqual([]);
        expect(levelOptions(lookup, null)).toEqual([]);
    });

    it("expands a span to every vertebra it covers", () => {
        expect(spannedVertebrae(levels, "L4-L5")).toEqual(["L4", "L5"]);
        expect(spannedVertebrae(levels, "L2-L5")).toEqual([
            "L2",
            "L3",
            "L4",
            "L5",
        ]);
        expect(spannedVertebrae(levels, "T10-L2")).toEqual([
            "T10",
            "T11",
            "T12",
            "L1",
            "L2",
        ]);
    });

    it("takes the ends of a span in either order", () => {
        expect(spannedVertebrae(levels, "L5-L2")).toEqual([
            "L2",
            "L3",
            "L4",
            "L5",
        ]);
    });

    it("reads C0 as the occiput", () => {
        expect(spannedVertebrae(levels, "C0-C2")).toEqual([
            "Occiput",
            "C1",
            "C2",
        ]);
    });

    it("expands nothing unless both ends name a vertebra", () => {
        expect(spannedVertebrae(levels, "L4-L9")).toEqual([]);
        expect(spannedVertebrae(levels, "C8-T1")).toEqual([]);
        expect(spannedVertebrae(levels, "L4")).toEqual([]);
        expect(spannedVertebrae(levels, "")).toEqual([]);
        expect(spannedVertebrae(levels, undefined)).toEqual([]);
    });

    it("expands a span to the interspaces it fully encloses", () => {
        expect(spannedInterspaces(levels, "L2-L5")).toEqual([
            "L2-L3",
            "L3-L4",
            "L4-L5",
        ]);
        expect(spannedInterspaces(levels, "L4-S1")).toEqual(["L4-L5", "L5-S1"]);
    });

    it("resolves an exact interspace to itself", () => {
        expect(spannedInterspaces(levels, "C5-C6")).toEqual(["C5-C6"]);
        expect(spannedInterspaces(levels, "T12-L1")).toEqual(["T12-L1"]);
        expect(spannedInterspaces(levels, "C0-C1")).toEqual(["C0-C1"]);
    });

    it("sorts level codes by ordinal, never as strings", () => {
        const picked = ["T10", "L1", "T2", "C7"];

        expect(sortLevelCodes(lookup, picked, "vertebra")).toEqual([
            "C7",
            "T2",
            "T10",
            "L1",
        ]);
        expect(
            sortLevelCodes(lookup, ["T10-T11", "T2-T3"], "interspace"),
        ).toEqual(["T2-T3", "T10-T11"]);
        expect(picked).toEqual(["T10", "L1", "T2", "C7"]);
    });
});
