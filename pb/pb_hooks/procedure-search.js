/// <reference path="../pb_data/types.d.ts" />

/**
 * The All Procedures page: its paged table, `GET /api/procedures/search`, and
 * its CSV export, `GET /api/procedures/csv`.
 *
 * Both routes take the page's own URL parameters and build their conditions
 * with `buildProcedureConditions`, the one place the page's search and
 * filters are turned into a query. The browser only passes its URL along, so
 * the export holds exactly what the table pages through.
 *
 * The conditions are SQL rather than a PocketBase filter string because a
 * hook can count records only by database expression (`countRecords`), and
 * the table needs a total without reading every match. The same expressions
 * select the rows and count them.
 */

/** Everything the page's table needs expanded on a procedure. */
const SEARCH_EXPAND = [
    "patient",
    "addedBy",
    "procedureDay.otList",
    "operatingRoom",
    "procedureCodes_via_procedure.concept",
    "procedureCodes_via_procedure.spinalLevels",
];

const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 200;

/** The URL parameters `buildProcedureConditions` reads. */
const FILTER_PARAMS = [
    "search",
    "upcoming",
    "from",
    "to",
    "showRemoved",
    "uncoded",
    "pac",
    "addedBy",
    "f_method",
    "f_procedureSite",
    "f_surgicalApproach",
    "f_device",
    "f_morphology",
    "f_intent",
];

/** A concept facet's URL parameter and its relation field on `procedureConcepts`. */
const FACET_FIELDS = {
    f_method: "method",
    f_procedureSite: "procedureSite",
    f_surgicalApproach: "surgicalApproach",
    f_device: "device",
    f_morphology: "morphology",
    f_intent: "defaultIntent",
};

const PAC_STATUS_LABELS = {
    referred: "Referred",
    inReview: "In Review",
    cleared: "Cleared",
    unfit: "Unfit",
};

// A cell a spreadsheet would run as a formula if opened as-is. Patient names and
// free text are typed by staff or pasted from other systems, so they get a
// leading apostrophe, which a spreadsheet shows as plain text.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (FORMULA_START.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Renders rows (arrays of cell values, the header row first) as CSV text. */
function toCsv(rows) {
    return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** A request's filter and paging parameters, by name. */
function queryFromRequest(e) {
    const values = e.request.url.query();
    const query = {};
    FILTER_PARAMS.concat(["page", "perPage"]).forEach((name) => {
        query[name] = values.get(name);
    });
    return query;
}

// "Contains", as the `~` of a PocketBase filter: the term's own % and _ are
// escaped so they match themselves.
const LIKE = "LIKE {:search} ESCAPE '\\'";
const likePattern = (term) => `%${term.replace(/[\\%_]/g, "\\$&")}%`;

// The procedures with at least one procedure code whose concept satisfies
// `where`, optionally through one of the concept's facet relations.
const withConcept = (where, facetField) =>
    "[[procedures.id]] IN (SELECT [[procedureCodes.procedure]] FROM {{procedureCodes}}" +
    " INNER JOIN {{procedureConcepts}} ON [[procedureConcepts.id]] = [[procedureCodes.concept]]" +
    (facetField
        ? ` INNER JOIN {{procedureFacetValues}} ON [[procedureFacetValues.id]] = [[procedureConcepts.${facetField}]]`
        : "") +
    ` WHERE ${where})`;

/** A "YYYY-MM-DD" URL parameter, or "" if it is not one. */
const calendarDate = (value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";

/**
 * The conditions for the page's URL parameters, each `{ sql, params }` in
 * the form `$dbx.exp` takes; a procedure must meet all of them. Every value
 * from the request is a bound parameter, never part of the SQL, and each
 * parameter name is used by one condition only.
 *
 * @param {Object} query - the URL parameters by name
 * @param {string} today - today's date at the hospital, "YYYY-MM-DD"
 */
function buildProcedureConditions(query, today) {
    const { UNCODED_CONCEPT_ID } = require(`${__hooks}/procedure-codes.js`);

    const conditions = [];
    const add = (sql, params = {}) => conditions.push({ sql, params });

    const search = String(query.search || "").trim();
    if (search) {
        add(
            `([[procedures.diagnosis]] ${LIKE} OR [[procedures.procedure]] ${LIKE}` +
                " OR [[procedures.patient]] IN (SELECT [[patients.id]] FROM {{patients}}" +
                ` WHERE [[patients.nid]] ${LIKE} OR [[patients.hospitalId]] ${LIKE} OR [[patients.name]] ${LIKE}))`,
            { search: likePattern(search) },
        );
    }

    if (query.upcoming === "true") {
        // Today at the hospital, the same line upcomingOtDays draws. A stored
        // calendar date ("2026-10-10 00:00:00.000Z") sorts at or after its
        // own date part.
        add(
            "[[procedures.procedureDay]] IN (SELECT [[otDays.id]] FROM {{otDays}} WHERE [[otDays.date]] >= {:today})",
            { today },
        );
    }

    // The OT day's date, from and to inclusive. Anything that is not a
    // calendar date is ignored rather than compared as text.
    const from = calendarDate(query.from);
    if (from) {
        add(
            "[[procedures.procedureDay]] IN (SELECT [[otDays.id]] FROM {{otDays}} WHERE [[otDays.date]] >= {:fromDate})",
            { fromDate: from },
        );
    }

    // The stored value carries a time, so "to" reaches the end of its day
    // or the day itself would fall outside.
    const to = calendarDate(query.to);
    if (to) {
        add(
            "[[procedures.procedureDay]] IN (SELECT [[otDays.id]] FROM {{otDays}} WHERE [[otDays.date]] <= {:toDate})",
            { toDate: `${to} 23:59:59.999Z` },
        );
    }

    if (query.showRemoved !== "true") {
        add("[[procedures.removed]] = FALSE");
    }

    Object.keys(FACET_FIELDS).forEach((name) => {
        if (!query[name]) return;
        add(
            withConcept(
                `[[procedureFacetValues.term]] = {:${name}}`,
                FACET_FIELDS[name],
            ),
            { [name]: query[name] },
        );
    });

    // Procedures still carrying the uncoded sentinel - the coverage gap the
    // catalogue custodian works through (spec section 8).
    if (query.uncoded === "true") {
        add(withConcept("[[procedureConcepts.conceptId]] = {:uncoded}"), {
            uncoded: UNCODED_CONCEPT_ID,
        });
    }

    // Current PAC status. "none" is procedures with none recorded yet.
    if (query.pac === "none") {
        add(
            "([[procedures.pacStatus]] = '' OR [[procedures.pacStatus]] IS NULL)",
        );
    } else if (query.pac) {
        add("[[procedures.pacStatus]] = {:pac}", { pac: query.pac });
    }

    if (query.addedBy) {
        add("[[procedures.addedBy]] = {:addedBy}", { addedBy: query.addedBy });
    }

    return conditions;
}

/** The conditions as database expressions, for a query or `countRecords`. */
function procedureExpressions(query, today) {
    return buildProcedureConditions(query, today).map(({ sql, params }) =>
        $dbx.exp(sql, params),
    );
}

/**
 * The procedures meeting `expressions`, in list order: all of them, or
 * `limit` of them from `offset`.
 *
 * Ordered by the OT day's date; the id breaks ties within a day, so the order
 * is the same on every request and consecutive pages neither repeat nor skip
 * a procedure.
 */
function findProcedures(app, expressions, limit = 0, offset = 0) {
    const records = arrayOf(new Record());

    const select = app
        .recordQuery("procedures")
        .leftJoin(
            "otDays",
            $dbx.exp("[[otDays.id]] = [[procedures.procedureDay]]"),
        )
        .orderBy("otDays.date ASC", "procedures.id ASC");

    expressions.forEach((expression) => select.andWhere(expression));
    if (limit) select.limit(limit).offset(offset);

    select.all(records);

    return records;
}

/**
 * Which slice of `totalItems` a request's `page` and `perPage` ask for. A
 * missing or nonsense value falls back to the first page of the default size.
 */
function pageBounds(query, totalItems) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const perPage = Math.min(
        MAX_PER_PAGE,
        Math.max(1, parseInt(query.perPage, 10) || DEFAULT_PER_PAGE),
    );

    return {
        page,
        perPage,
        totalItems,
        totalPages: Math.ceil(totalItems / perPage),
        offset: (page - 1) * perPage,
    };
}

/**
 * One page of the procedures matching the page's URL parameters, in the shape
 * the collection API's list gives: `{ page, perPage, totalItems, totalPages,
 * items }`, the items expanded for the table.
 *
 * Two queries on the same expressions: a count for the totals, and the
 * page's own rows.
 */
function searchProcedures(e, query) {
    const { todayDate } = require(`${__hooks}/app-settings.js`);

    const expressions = procedureExpressions(query, todayDate($app));

    const totalItems = $app.countRecords("procedures", ...expressions);
    const { offset, ...paging } = pageBounds(query, totalItems);
    const items = findProcedures($app, expressions, paging.perPage, offset);

    // Expands through the request, so related records are held to their own
    // view rules for whoever is asking.
    $apis.enrichRecords(e, items, ...SEARCH_EXPAND);

    return { ...paging, items };
}

// A calendar date as YYYY-MM-DD, so a spreadsheet sorts it correctly. Taken
// from the stored date part, never through a Date.
function csvDate(value) {
    const match = /^\d{4}-\d{2}-\d{2}/.exec(String(value || ""));
    return match ? match[0] : "";
}

/**
 * Every procedure matching the page's URL parameters, as a CSV file.
 *
 * @returns {{ content: string, type: string, fileName: string }}
 */
function getProceduresCsvReport(app, query) {
    const { describeProcedureCodes } = require(`${__hooks}/procedure-codes.js`);
    const { todayDate } = require(`${__hooks}/app-settings.js`);

    const today = todayDate(app);
    const records = findProcedures(app, procedureExpressions(query, today));

    app.expandRecords(
        records,
        ["patient", "addedBy", "operatingRoom", "procedureDay.otList"],
        null,
    );

    const name = (record) => (record ? record.getString("name") : "");

    const rows = [
        [
            "Date",
            "List",
            "Room",
            "NID",
            "Hospital ID",
            "Name",
            "Diagnosis",
            "Procedure",
            "Comorbidities",
            "Anesthesia",
            "Duration (minutes)",
            "Bed",
            "PAC Status",
            "Added By",
            "Added Date",
            "Remarks",
            "Special Requirements",
            "Removed",
        ],
    ];

    records.forEach((procedure) => {
        const patient = procedure.expandedOne("patient");
        const day = procedure.expandedOne("procedureDay");

        rows.push([
            day ? csvDate(day.getString("date")) : "",
            name(day ? day.expandedOne("otList") : null),
            name(procedure.expandedOne("operatingRoom")),
            patient ? patient.getString("nid") : "",
            patient ? patient.getString("hospitalId") : "",
            name(patient),
            procedure.getString("diagnosis"),
            describeProcedureCodes(app, procedure),
            procedure.getString("comorbids"),
            procedure.getString("anesthesia"),
            procedure.getInt("duration") || "",
            procedure.getString("bed"),
            PAC_STATUS_LABELS[procedure.getString("pacStatus")] || "",
            name(procedure.expandedOne("addedBy")),
            csvDate(procedure.getString("addedDate")),
            procedure.getString("remarks"),
            procedure.getString("requirements"),
            procedure.getBool("removed") ? "Yes" : "",
        ]);
    });

    return {
        // The leading byte order mark is what makes Excel read the file as
        // UTF-8 rather than the local code page.
        content: "﻿" + toCsv(rows),
        type: "text/csv;charset=utf-8",
        fileName: `procedures-${today}.csv`,
    };
}

module.exports = {
    buildProcedureConditions,
    getProceduresCsvReport,
    pageBounds,
    queryFromRequest,
    searchProcedures,
    toCsv,
};
