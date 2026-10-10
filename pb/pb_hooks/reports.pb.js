/// <reference path="../pb_data/types.d.ts" />

console.log("Loading hooks/reports.js");

routerAdd(
    "GET",
    "/api/lists/{otDayId}/html",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const otDayId = e.request.pathValue("otDayId");

        console.log("[html list] Generating HTML report for otDayId:", otDayId);

        try {
            const reports = require(`${__hooks}/reports.js`);

            const report = reports.getOtListHTMLReport(otDayId);

            return e.json(200, {
                success: true,
                report: report,
            });
        } catch (error) {
            console.error(
                "[html list] Error generating OT list HTML report:",
                error,
            );
            throw new InternalServerError(
                "Failed to generate html report for some reason.",
            );
        }
    },
    $apis.requireAuth(),
);

// One page of the All Procedures table. Takes the page's own URL parameters
// (search, the toggles and the filters) plus `page` and `perPage`, and answers
// in the collection API's list shape, totals included. Any signed-in role may
// read procedures.
routerAdd(
    "GET",
    "/api/procedures/search",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        try {
            const { queryFromRequest, searchProcedures } = require(
                `${__hooks}/procedure-search.js`,
            );

            const result = searchProcedures(e, queryFromRequest(e));

            return e.json(200, {
                success: true,
                ...result,
            });
        } catch (error) {
            console.error(
                "[procedures search] Error searching procedures:",
                error,
            );
            throw new InternalServerError(
                "Failed to search procedures for some reason.",
            );
        }
    },
    $apis.requireAuth(),
);

// The same search as a CSV file: every procedure the table pages through,
// not one page of them.
routerAdd(
    "GET",
    "/api/procedures/csv",
    (e) => {
        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        try {
            const { getProceduresCsvReport, queryFromRequest } = require(
                `${__hooks}/procedure-search.js`,
            );

            const report = getProceduresCsvReport($app, queryFromRequest(e));

            return e.json(200, {
                success: true,
                report: report,
            });
        } catch (error) {
            console.error(
                "[procedures csv] Error generating procedures CSV:",
                error,
            );
            throw new InternalServerError(
                "Failed to generate the procedures CSV for some reason.",
            );
        }
    },
    $apis.requireAuth(),
);

// routerAdd(
//     "GET",
//     "/api/lists/{otDayId}/pdf",
//     (e) => {
//         const authRecord = e.auth;
//         if (!authRecord) {
//             throw new UnauthorizedError("Authentication required");
//         }

//         const otDayId = e.request.pathValue("otDayId");

//         console.log("[pdf list] Generating PDF report for otDayId:", otDayId);

//         try {
//             const reports = require(`${__hooks}/reports.js`);

//             const report = reports.getOtListPdfReport(otDayId);

//             return e.json(200, {
//                 success: true,
//                 report: report,
//             });
//         } catch (error) {
//             console.error(
//                 "[pdf list] Error generating OT list PDF report:",
//                 error,
//             );
//             throw new InternalServerError(
//                 "Failed to generate pdf report for some reason.",
//             );
//         }
//     },
//     $apis.requireAuth(),
// );

// routerAdd(
//     "GET",
//     "/api/lists/{otDayId}/docx",
//     (e) => {
//         const authRecord = e.auth;
//         if (!authRecord) {
//             throw new UnauthorizedError("Authentication required");
//         }

//         const otDayId = e.request.pathValue("otDayId");

//         console.log("[docx list] Generating DOCX report for otDayId:", otDayId);

//         try {
//             const reports = require(`${__hooks}/reports.js`);

//             const report = reports.getOtListDocxReport(otDayId);

//             return e.json(200, {
//                 success: true,
//                 report: report,
//             });
//         } catch (error) {
//             console.error(
//                 "[docx list] Error generating OT list DOCX report:",
//                 error,
//             );
//             throw new InternalServerError(
//                 "Failed to generate docx report for some reason.",
//             );
//         }
//     },
//     $apis.requireAuth(),
// );
