import { describe, expect, it } from "vitest";

import { loadHook } from "./load-hook.js";

const { buildProcedureConditions, pageBounds, toCsv } = loadHook(
    "procedure-search.js",
);

describe("toCsv", () => {
    it("joins cells with commas and rows with CRLF", () => {
        expect(
            toCsv([
                ["Date", "Name"],
                ["2026-01-05", "Aishath"],
            ]),
        ).toBe("Date,Name\r\n2026-01-05,Aishath");
    });

    it("quotes a cell holding a comma, a quote or a line break", () => {
        expect(toCsv([["a,b", 'say "hi"', "line1\nline2"]])).toBe(
            '"a,b","say ""hi""","line1\nline2"',
        );
    });

    it("writes null and undefined as empty cells and keeps zero", () => {
        expect(toCsv([[null, undefined, 0, ""]])).toBe(",,0,");
    });

    it("prefixes a cell a spreadsheet would run as a formula", () => {
        expect(toCsv([["=SUM(A1)", "+1", "-2", "@cmd"]])).toBe(
            "'=SUM(A1),'+1,'-2,'@cmd",
        );
    });
});

describe("buildProcedureConditions", () => {
    const TODAY = "2026-10-10";

    // The one condition a query adds once removed procedures are let in.
    const only = (query) => {
        const conditions = buildProcedureConditions(
            { showRemoved: "true", ...query },
            TODAY,
        );
        expect(conditions).toHaveLength(1);
        return conditions[0];
    };

    it("leaves out removed procedures unless asked for them", () => {
        expect(buildProcedureConditions({}, TODAY)).toEqual([
            { sql: "[[procedures.removed]] = FALSE", params: {} },
        ]);
        expect(
            buildProcedureConditions({ showRemoved: "true" }, TODAY),
        ).toEqual([]);
    });

    it("binds the trimmed search term rather than writing it into the SQL", () => {
        const { sql, params } = only({ search: " a' OR 1=1 -- " });

        expect(sql).not.toContain("1=1");
        expect(params).toEqual({ search: "%a' OR 1=1 --%" });
    });

    it("searches the diagnosis, the old procedure text and the patient", () => {
        const { sql } = only({ search: "smith" });

        for (const column of [
            "procedures.diagnosis",
            "procedures.procedure",
            "patients.nid",
            "patients.hospitalId",
            "patients.name",
        ]) {
            expect(sql).toContain(`[[${column}]] LIKE {:search} ESCAPE '\\'`);
        }
    });

    it("matches the search term's own wildcards literally", () => {
        expect(only({ search: "50%_a\\b" }).params).toEqual({
            search: "%50\\%\\_a\\\\b%",
        });
    });

    it("draws the upcoming line at the hospital's today", () => {
        const { sql, params } = only({ upcoming: "true" });

        expect(sql).toContain("[[otDays.date]] >= {:today}");
        expect(params).toEqual({ today: TODAY });
    });

    it("keeps OT days on or after the from date", () => {
        const { sql, params } = only({ from: "2026-03-01" });

        expect(sql).toContain("[[otDays.date]] >= {:fromDate}");
        expect(params).toEqual({ fromDate: "2026-03-01" });
    });

    it("keeps the whole of the to date, whose stored value carries a time", () => {
        const { sql, params } = only({ to: "2026-03-31" });

        expect(sql).toContain("[[otDays.date]] <= {:toDate}");
        expect(params).toEqual({ toDate: "2026-03-31 23:59:59.999Z" });
    });

    it("ignores a from or to that is not a calendar date", () => {
        expect(
            buildProcedureConditions(
                { from: "March", to: "2026-3-1", showRemoved: "true" },
                TODAY,
            ),
        ).toEqual([]);
    });

    it("filters a facet through its relation field on the concept", () => {
        const { sql, params } = only({ f_intent: "Curative" });

        expect(sql).toContain(
            "[[procedureFacetValues.id]] = [[procedureConcepts.defaultIntent]]",
        );
        expect(sql).toContain("[[procedureFacetValues.term]] = {:f_intent}");
        expect(params).toEqual({ f_intent: "Curative" });
    });

    it("gives each facet its own condition and parameter", () => {
        const conditions = buildProcedureConditions(
            { f_method: "Excision", f_device: "Shunt", showRemoved: "true" },
            TODAY,
        );

        expect(conditions.map(({ params }) => params)).toEqual([
            { f_method: "Excision" },
            { f_device: "Shunt" },
        ]);
    });

    it("matches the uncoded sentinel for uncoded only", () => {
        const { sql, params } = only({ uncoded: "true" });

        expect(sql).toContain("[[procedureConcepts.conceptId]] = {:uncoded}");
        expect(params).toEqual({ uncoded: "NSX-00000" });
    });

    it('reads PAC status "none" as no status recorded', () => {
        expect(only({ pac: "none" })).toEqual({
            sql: "([[procedures.pacStatus]] = '' OR [[procedures.pacStatus]] IS NULL)",
            params: {},
        });
        expect(only({ pac: "cleared" })).toEqual({
            sql: "[[procedures.pacStatus]] = {:pac}",
            params: { pac: "cleared" },
        });
    });

    it("filters by the surgeon who added the procedure", () => {
        expect(only({ addedBy: "surgeon00000001" })).toEqual({
            sql: "[[procedures.addedBy]] = {:addedBy}",
            params: { addedBy: "surgeon00000001" },
        });
    });
});

describe("pageBounds", () => {
    it("cuts the requested page out of the matches", () => {
        expect(pageBounds({ page: "3", perPage: "50" }, 120)).toEqual({
            page: 3,
            perPage: 50,
            totalItems: 120,
            totalPages: 3,
            offset: 100,
        });
    });

    it("falls back to the first page of 50 on a missing or nonsense value", () => {
        const first = { page: 1, perPage: 50, offset: 0 };

        expect(pageBounds({}, 10)).toMatchObject(first);
        expect(pageBounds({ page: "-4", perPage: "abc" }, 10)).toMatchObject(
            first,
        );
    });

    it("caps the page size at 200", () => {
        expect(pageBounds({ perPage: "100000" }, 10).perPage).toBe(200);
    });

    it("reports no pages when nothing matches", () => {
        expect(pageBounds({}, 0)).toMatchObject({
            totalItems: 0,
            totalPages: 0,
        });
    });
});
