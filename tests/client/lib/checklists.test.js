import { describe, expect, it } from "vitest";

import {
    ITEM_KEY_PATTERN,
    criteriaCount,
    criteriaOverlap,
    describeAgeRange,
    describeCriteria,
    describeRebuild,
    findKeyOverlaps,
    formatAgeMonths,
    patientChanges,
    withGroupHeadings,
} from "@/lib/checklists";

// Section numbers are those of specs/checklists/README.md.

describe("ages in words (§8.2)", () => {
    it("formats months as years and months", () => {
        expect(formatAgeMonths(8)).toBe("8 m");
        expect(formatAgeMonths(192)).toBe("16 y");
        expect(formatAgeMonths(18)).toBe("1 y 6 m");
    });

    it("reads the upper bound as 'under', because it is exclusive", () => {
        expect(describeAgeRange(144, 660)).toBe("from 12 y, under 55 y");
        expect(describeAgeRange(0, 12)).toBe("under 1 y");
        expect(describeAgeRange(192, 0)).toBe("from 16 y");
        expect(describeAgeRange(0, 0)).toBe("");
    });
});

describe("describeCriteria (§8.1)", () => {
    it("leads with priority, then sex, then age", () => {
        expect(
            describeCriteria({
                sexes: ["female"],
                ageMinMonths: 144,
                ageMaxMonths: 660,
                priorities: ["emergency"],
            }),
        ).toBe("emergency · female · from 12 y, under 55 y");
    });

    it("lists priorities in urgency order, however they were ticked", () => {
        expect(describeCriteria({ priorities: ["emergency", "urgent"] })).toBe(
            "urgent or emergency",
        );
    });

    it("is empty when there are no criteria", () => {
        expect(describeCriteria(null)).toBe("");
        expect(describeCriteria({})).toBe("");
        expect(
            describeCriteria({ sexes: [], priorities: [], ageMinMonths: 0 }),
        ).toBe("");
    });
});

describe("criteriaCount (§4)", () => {
    it("counts sex, age and priority as one each", () => {
        expect(criteriaCount({})).toBe(0);
        expect(criteriaCount({ sexes: ["female"] })).toBe(1);
        expect(criteriaCount({ ageMinMonths: 144, ageMaxMonths: 660 })).toBe(1);
        expect(criteriaCount({ priorities: ["urgent", "emergency"] })).toBe(1);
        expect(
            criteriaCount({
                sexes: ["female"],
                ageMaxMonths: 192,
                priorities: ["elective"],
            }),
        ).toBe(3);
    });
});

describe("criteriaOverlap (§8.2)", () => {
    const UNDER_16 = { ageMaxMonths: 192 };
    const FROM_16 = { ageMinMonths: 192 };
    const UNDER_18 = { ageMaxMonths: 216 };

    it("sees adjacent half-open age bands as disjoint", () => {
        expect(criteriaOverlap(UNDER_16, FROM_16)).toBe(false);
        expect(criteriaOverlap(FROM_16, UNDER_16)).toBe(false);
    });

    it("sees age bands that share a month as overlapping", () => {
        expect(criteriaOverlap(UNDER_16, UNDER_18)).toBe(true);
        expect(criteriaOverlap(FROM_16, UNDER_18)).toBe(true);
        expect(criteriaOverlap(FROM_16, { ageMinMonths: 216 })).toBe(true);
    });

    it("sees disjoint sexes or priorities as disjoint", () => {
        expect(criteriaOverlap({ sexes: ["female"] }, { sexes: ["male"] })).toBe(
            false,
        );
        expect(
            criteriaOverlap(
                { priorities: ["elective"] },
                { priorities: ["emergency"] },
            ),
        ).toBe(false);
    });

    it("treats an unset criterion as overlapping anything", () => {
        expect(criteriaOverlap({ priorities: ["elective"] }, {})).toBe(true);
        expect(criteriaOverlap({ sexes: ["female"] }, UNDER_16)).toBe(true);
        expect(criteriaOverlap({}, {})).toBe(true);
    });

    it("needs every criterion to be able to hold at once", () => {
        expect(
            criteriaOverlap(
                { sexes: ["female"], ageMaxMonths: 192 },
                { sexes: ["female"], ageMinMonths: 192 },
            ),
        ).toBe(false);
        expect(
            criteriaOverlap(
                { priorities: ["urgent", "emergency"], ageMaxMonths: 192 },
                { priorities: ["emergency"], ageMaxMonths: 216 },
            ),
        ).toBe(true);
    });
});

describe("findKeyOverlaps (§8.2)", () => {
    const UNDER_16 = { id: "under-16", scope: "all", ageMaxMonths: 192 };
    const UNDER_18 = { id: "under-18", scope: "all", ageMaxMonths: 216 };
    const FROM_16 = { id: "from-16", scope: "all", ageMinMonths: 192 };
    const GLOBAL = { id: "global", scope: "all" };
    const SPINE_UNDER_18 = { id: "spine-under-18", scope: "subspecialty", ageMaxMonths: 216 };
    const GIRLS_UNDER_18 = { id: "girls-under-18", scope: "all", ageMaxMonths: 216, sexes: ["female"] };

    const templates = [UNDER_16, UNDER_18, FROM_16, GLOBAL, SPINE_UNDER_18, GIRLS_UNDER_18];
    const keys = templates.map((template) => ({
        itemKey: "consent-signed",
        template: template.id,
    }));
    const overlaps = (template) =>
        findKeyOverlaps(template, template.id, templates, keys).map(
            (overlap) => overlap.template.id,
        );

    it("reports a key shared with a template one patient could also match", () => {
        expect(overlaps(UNDER_16)).toEqual(["under-18"]);
    });

    it("says nothing about bands that cannot overlap, a different scope or a different criteria count", () => {
        expect(overlaps(UNDER_18)).toEqual(["under-16", "from-16"]);
        expect(overlaps(FROM_16)).toEqual(["under-18"]);
        expect(overlaps(SPINE_UNDER_18)).toEqual([]);
        expect(overlaps(GIRLS_UNDER_18)).toEqual([]);
    });

    it("says nothing for a template with no criteria: plain reuse is how dedupe works", () => {
        expect(overlaps(GLOBAL)).toEqual([]);
    });

    it("only looks at keys the template itself has", () => {
        const others = [
            { itemKey: "consent-signed", template: "under-16" },
            { itemKey: "bloods", template: "under-18" },
        ];

        expect(findKeyOverlaps(UNDER_16, "under-16", templates, others)).toEqual(
            [],
        );
    });

    it("names the key with the template", () => {
        expect(findKeyOverlaps(UNDER_16, "under-16", templates, keys)).toEqual([
            { itemKey: "consent-signed", template: UNDER_18 },
        ]);
    });
});

describe("patientChanges (§6)", () => {
    const patient = { dateOfBirth: "2009-03-12 00:00:00.000Z", sex: "female" };

    it("is empty when the checklist was built from the current details", () => {
        expect(
            patientChanges({ dateOfBirth: "2009-03-12", sex: "female" }, patient),
        ).toEqual([]);
    });

    it("is empty for a checklist that predates the basis, or with no patient", () => {
        expect(patientChanges(null, patient)).toEqual([]);
        expect(patientChanges({ dateOfBirth: "2009-03-12", sex: "female" }, null)).toEqual([]);
    });

    it("reports a corrected date of birth and sex", () => {
        expect(
            patientChanges({ dateOfBirth: "2011-03-12", sex: "male" }, patient),
        ).toEqual([
            { field: "dateOfBirth", from: "2011-03-12", to: "2009-03-12" },
            { field: "sex", from: "male", to: "female" },
        ]);
    });

    it("reports a value entered where there was none, and one since cleared", () => {
        expect(patientChanges({ dateOfBirth: null, sex: "female" }, patient)).toEqual([
            { field: "dateOfBirth", from: null, to: "2009-03-12" },
        ]);
        expect(
            patientChanges(
                { dateOfBirth: "2009-03-12", sex: "female" },
                { dateOfBirth: "", sex: "" },
            ),
        ).toEqual([
            { field: "dateOfBirth", from: "2009-03-12", to: null },
            { field: "sex", from: "female", to: null },
        ]);
    });
});

describe("describeRebuild (§5)", () => {
    it("says so when nothing changed", () => {
        expect(
            describeRebuild({ added: 0, removed: 0, madeInapplicable: 0, restored: 0 }),
        ).toBe("no changes");
    });

    it("lists what changed, in the singular and the plural", () => {
        expect(describeRebuild({ added: 2, madeInapplicable: 1 })).toBe(
            "2 items added, 1 no longer applies",
        );
        expect(
            describeRebuild({ added: 1, removed: 2, madeInapplicable: 2, restored: 1 }),
        ).toBe("1 item added, 2 items removed, 2 no longer apply, 1 item restored");
    });
});

describe("ITEM_KEY_PATTERN (§8.2)", () => {
    it("accepts lower-case words joined by single hyphens", () => {
        for (const key of ["consent", "consent-signed", "mri-3t-done", "2-units"]) {
            expect(key).toMatch(ITEM_KEY_PATTERN);
        }
    });

    it("refuses anything else", () => {
        for (const key of ["", "Consent", "consent signed", "consent_signed", "-consent", "consent-", "consent--signed"]) {
            expect(key).not.toMatch(ITEM_KEY_PATTERN);
        }
    });
});

describe("withGroupHeadings (§8.1)", () => {
    it("emits a heading each time the group changes", () => {
        const rows = withGroupHeadings([
            { id: "1", group: "preop" },
            { id: "2", group: "preop" },
            { id: "3", group: "theatre" },
        ]);

        expect(rows.map((row) => row.heading ?? row.item.id)).toEqual([
            "preop",
            "1",
            "2",
            "theatre",
            "3",
        ]);
    });

    it("keeps the heading when every item is in one group", () => {
        expect(withGroupHeadings([{ id: "1", group: "postop" }])).toHaveLength(2);
    });

    it("walks the list in the order given and never sorts by group", () => {
        const rows = withGroupHeadings([
            { id: "1", group: "preop" },
            { id: "2", group: "dayof" },
        ]);

        expect(rows.filter((row) => row.heading).map((row) => row.heading)).toEqual(
            ["preop", "dayof"],
        );
    });

    it("renders no heading for no items", () => {
        expect(withGroupHeadings([])).toEqual([]);
    });
});
