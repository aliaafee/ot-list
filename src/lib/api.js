import { pb } from "./pb";

export const api = {
    async addProcedureWithPatient(patient, procedure) {
        const response = await pb.send("/api/add-procedure-with-patient", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ patient, procedure }),
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

        return response.createdStatus;
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
