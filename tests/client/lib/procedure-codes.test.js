import { describe, expect, it } from "vitest";

import {
    UNCODED_CONCEPT_ID,
    describeProcedureCode,
    describeProcedureCodes,
    describeProcedureCodesSimplified,
    fromProcedureCodeRecords,
    isFilledCode,
    procedureCodeRecordsOf,
    toProcedureCodesPayload,
} from "@/lib/procedure-codes";

// Section numbers are those of specs/procedure_codes/README.md.

const ACDF = { conceptId: "NSX-00042", preferredTerm: "ACDF" };
const UNCODED = { conceptId: UNCODED_CONCEPT_ID, preferredTerm: "Uncoded procedure" };
const CATALOGUE = { [ACDF.conceptId]: ACDF, [UNCODED.conceptId]: UNCODED };
const conceptById = (id) => CATALOGUE[id];

describe("isFilledCode (§4.4)", () => {
    it("is false for the blank rows the form list pads with", () => {
        expect(isFilledCode("")).toBe(false);
        expect(isFilledCode(null)).toBe(false);
        expect(isFilledCode(undefined)).toBe(false);
        expect(isFilledCode({ concept: null, freeText: "   " })).toBe(false);
    });

    it("is true for a concept or for typed text", () => {
        expect(isFilledCode({ concept: ACDF, freeText: "" })).toBe(true);
        expect(isFilledCode({ concept: null, freeText: "Odd procedure" })).toBe(
            true,
        );
    });
});

describe("toProcedureCodesPayload (§4.4)", () => {
    it("flattens the qualifiers and sends catalogue ids", () => {
        const payload = toProcedureCodesPayload([
            {
                concept: ACDF,
                freeText: "",
                postCoordination: {
                    laterality: "left",
                    revisionStatus: "revision",
                    priority: "urgent",
                    stagedSequence: 2,
                    intentOverride: "Palliative",
                    spinalLevels: ["C5-C6", "C6-C7"],
                },
            },
        ]);

        expect(payload).toEqual([
            {
                conceptId: "NSX-00042",
                freeText: "",
                position: 0,
                laterality: "left",
                revisionStatus: "revision",
                priority: "urgent",
                intentOverride: "Palliative",
                stagedSequence: 2,
                spinalLevels: ["C5-C6", "C6-C7"],
            },
        ]);
    });

    it("sends empty values, not invented ones, for qualifiers left unset", () => {
        expect(
            toProcedureCodesPayload([{ concept: ACDF, freeText: "" }]),
        ).toEqual([
            {
                conceptId: "NSX-00042",
                freeText: "",
                position: 0,
                laterality: "",
                revisionStatus: "",
                priority: "",
                intentOverride: "",
                stagedSequence: null,
                spinalLevels: [],
            },
        ]);
    });

    it("drops blank rows and numbers what is left from zero", () => {
        const payload = toProcedureCodesPayload([
            "",
            { concept: ACDF, freeText: "" },
            { concept: null, freeText: "  " },
            { concept: UNCODED, freeText: "Odd procedure" },
            "",
        ]);

        expect(payload.map((code) => [code.conceptId, code.position])).toEqual([
            ["NSX-00042", 0],
            ["NSX-00000", 1],
        ]);
    });

    it("codes typed text with no concept against the uncoded sentinel", () => {
        const [code] = toProcedureCodesPayload([
            { concept: null, freeText: "Odd procedure" },
        ]);

        expect(code).toMatchObject({
            conceptId: "NSX-00000",
            freeText: "Odd procedure",
        });
    });

    it("gives an empty list for no entries at all", () => {
        expect(toProcedureCodesPayload(undefined)).toEqual([]);
        expect(toProcedureCodesPayload([])).toEqual([]);
    });
});

describe("fromProcedureCodeRecords (§4.4)", () => {
    const record = (over = {}) => ({
        position: 0,
        freeText: "",
        laterality: "",
        revisionStatus: "",
        priority: "",
        intentOverride: "",
        stagedSequence: 0,
        expand: { concept: { conceptId: "NSX-00042" }, spinalLevels: [] },
        ...over,
    });

    it("resolves the concept against the loaded catalogue", () => {
        expect(fromProcedureCodeRecords([record()], conceptById)).toEqual([
            { concept: ACDF, freeText: "", postCoordination: undefined },
        ]);
    });

    it("rebuilds only the qualifiers that were set", () => {
        const [entry] = fromProcedureCodeRecords(
            [
                record({
                    laterality: "left",
                    priority: "urgent",
                    expand: {
                        concept: { conceptId: "NSX-00042" },
                        spinalLevels: [{ code: "C5-C6" }, { code: "C6-C7" }],
                    },
                }),
            ],
            conceptById,
        );

        expect(entry.postCoordination).toEqual({
            laterality: "left",
            priority: "urgent",
            spinalLevels: ["C5-C6", "C6-C7"],
        });
    });

    it("reads a staged sequence of 0 as not staged", () => {
        const [unset, staged] = fromProcedureCodeRecords(
            [record(), record({ position: 1, stagedSequence: 2 })],
            conceptById,
        );

        expect(unset.postCoordination).toBeUndefined();
        expect(staged.postCoordination).toEqual({ stagedSequence: 2 });
    });

    it("orders by position without mutating the records", () => {
        const records = [
            record({ position: 1, freeText: "second" }),
            record({ position: 0, freeText: "first" }),
        ];

        expect(
            fromProcedureCodeRecords(records, conceptById).map((e) => e.freeText),
        ).toEqual(["first", "second"]);
        expect(records[0].freeText).toBe("second");
    });

    it("gives a null concept for one the catalogue does not know", () => {
        const [entry] = fromProcedureCodeRecords(
            [record({ expand: { concept: { conceptId: "NSX-99999" } } })],
            conceptById,
        );

        expect(entry.concept).toBeNull();
    });

    it("is the inverse of toProcedureCodesPayload", () => {
        const entries = [
            {
                concept: ACDF,
                freeText: "",
                postCoordination: {
                    laterality: "right",
                    revisionStatus: "primary",
                    priority: "elective",
                    intentOverride: "Diagnostic",
                    stagedSequence: 1,
                    spinalLevels: ["C5-C6"],
                },
            },
            { concept: UNCODED, freeText: "Odd procedure", postCoordination: undefined },
        ];

        // What the server stores for a payload entry, as it reads back.
        const stored = toProcedureCodesPayload(entries).map((code) => ({
            ...code,
            stagedSequence: code.stagedSequence ?? 0,
            expand: {
                concept: { conceptId: code.conceptId },
                spinalLevels: code.spinalLevels.map((level) => ({ code: level })),
            },
        }));

        expect(fromProcedureCodeRecords(stored, conceptById)).toEqual(entries);
    });
});

describe("describeProcedureCode (§4.4)", () => {
    const stored = {
        displayTerm: "ACDF",
        laterality: "left",
        spinalLevelsSnapshot: "C5-C6, C6-C7",
        revisionStatus: "revision",
        priority: "emergency",
        stagedSequence: 2,
        expand: { concept: { preferredTerm: "Reworded since" } },
    };

    it("prints the term with its qualifiers in parentheses", () => {
        expect(describeProcedureCode(stored)).toBe(
            "ACDF (Left, C5-C6, C6-C7, Revision, Emergency, Stage 2)",
        );
    });

    it("keeps only the side and levels in the simplified form", () => {
        expect(describeProcedureCode(stored, true)).toBe(
            "ACDF (Left, C5-C6, C6-C7)",
        );
    });

    it("prints the term alone when there are no qualifiers", () => {
        expect(describeProcedureCode({ displayTerm: "ACDF" })).toBe("ACDF");
    });

    it("prints the term as it was coded, not as the concept reads now", () => {
        expect(
            describeProcedureCode({
                displayTerm: "As coded",
                freeText: "typed",
                expand: { concept: { preferredTerm: "Reworded since" } },
            }),
        ).toBe("As coded");
    });

    it("falls back to free text, then to the concept, for rows with no stamped term", () => {
        expect(
            describeProcedureCode({
                freeText: "Odd procedure",
                expand: { concept: { preferredTerm: "Uncoded procedure" } },
            }),
        ).toBe("Odd procedure");
        expect(
            describeProcedureCode({
                expand: { concept: { preferredTerm: "ACDF" } },
            }),
        ).toBe("ACDF");
    });

    it("prints the levels as they were recorded, not as the relation reads now", () => {
        expect(
            describeProcedureCode({
                displayTerm: "ACDF",
                spinalLevelsSnapshot: "C5-C6",
                expand: { spinalLevels: [{ code: "C6-C7" }] },
            }),
        ).toBe("ACDF (C5-C6)");
    });

    it("falls back to the level relation for rows with no snapshot", () => {
        expect(
            describeProcedureCode({
                displayTerm: "ACDF",
                spinalLevelsSnapshot: "",
                expand: { spinalLevels: [{ code: "C5-C6" }, { code: "C6-C7" }] },
            }),
        ).toBe("ACDF (C5-C6, C6-C7)");
    });

    it("gives an empty string for nothing", () => {
        expect(describeProcedureCode(undefined)).toBe("");
    });
});

describe("the codes of a procedure (§6)", () => {
    const procedure = {
        expand: {
            procedureCodes_via_procedure: [
                { position: 1, displayTerm: "Second", priority: "urgent" },
                { position: 0, displayTerm: "First", laterality: "right", priority: "urgent" },
            ],
        },
    };

    it("reads them off the expanded back-relation", () => {
        expect(procedureCodeRecordsOf(procedure)).toHaveLength(2);
        expect(procedureCodeRecordsOf({})).toEqual([]);
        expect(procedureCodeRecordsOf(null)).toEqual([]);
    });

    it("describes them in position order", () => {
        expect(describeProcedureCodes(procedure)).toEqual([
            "First (Right, Urgent)",
            "Second (Urgent)",
        ]);
        expect(describeProcedureCodesSimplified(procedure)).toEqual([
            "First (Right)",
            "Second",
        ]);
    });
});
