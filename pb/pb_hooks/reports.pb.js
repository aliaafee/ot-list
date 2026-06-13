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
                report: report
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

routerAdd(
    "GET",
    "/api/lists/{otDayId}/pdf",
    (e) => {

        const authRecord = e.auth;
        if (!authRecord) {
            throw new UnauthorizedError("Authentication required");
        }

        const otDayId = e.request.pathValue("otDayId");

        console.log("[pdf list] Generating PDF report for otDayId:", otDayId);

        try {
            const reports = require(`${__hooks}/reports.js`);

            const report = reports.getOtListPdfReport(otDayId);

            return e.json(200, { 
                success: true, 
                report: report 
            });
        } catch (error) {
            console.error(
                "[pdf list] Error generating OT list PDF report:",
                error,
            );
            throw new InternalServerError(
                "Failed to generate pdf report for some reason.",
            );
        }
    },
    $apis.requireAuth(),
);
