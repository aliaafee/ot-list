import { pb } from "./pb";

export const api = {
    /**
     * @param {Object|null} procedureCode - The `procedureCodes` body from
     *   buildProcedureCodeBody. Written in the same transaction as the
     *   procedure, because it carries the procedure's name.
     */
    async addProcedureWithPatient(patient, procedure, procedureCode = null) {
        const response = await pb.send("/api/add-procedure-with-patient", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ patient, procedure, procedureCode }),
        });

        console.log("API response:", response);

        if (!response.success) {
            throw new Error(
                response.message ||
                    "Failed to add procedure with patient, unknown error.",
            );
        }

        return response.procedure;
    },

    /**
     * @param {Array} procedures - Each needs an `id`; every other key is
     *   set on the record. A `procedureCode` key is the exception: it is
     *   the `procedureCodes` body to store, written in the same
     *   transaction. Omit it to leave the existing code untouched, which
     *   is what the reorder and remove paths want.
     */
    async bulkUpdateProcedures(procedures) {
        const response = await pb.send(`/api/bulk-update-procedures`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ procedures }),
        });

        if (!response.success) {
            throw new Error(
                response.message ||
                    "Failed to bulk update procedures, unknown error.",
            );
        }

        return response.updated;
    },

    async addPacStatus(procedureId, pacStatus) {
        const response = await pb.send(`/api/add-pac-status`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ procedureId, pacStatus }),
        });

        if (!response.success) {
            throw new Error(
                response.message || "Failed to add PAC status, unknown error.",
            );
        }

        return response.pacStatus;
    },

    async bulkCreateOtDays(otListId, dates, disabled = false) {
        const response = await pb.send(`/api/ot-days/bulk-create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ otListId, dates, disabled }),
        });

        if (!response.success) {
            throw new Error(
                response.message ||
                    "Failed to bulk create OT days, unknown error.",
            );
        }

        return response;
    },

    async generateOtListHtml(otDayId) {
        const response = await pb.send(`/api/lists/${otDayId}/html`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.success) {
            throw new Error(response.message || "Failed to generate report.");
        }

        return response.report;
    },
};
