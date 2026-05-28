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

        return response;
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

        return response;
    },

    async searchPatients(query, limit = 50, page = 1) {
        const params = new URLSearchParams({
            q: query,
            limit: limit.toString(),
            page: page.toString(),
        });

        const response = await pb.send(`/api/patients/search?${params}`, {
            method: "GET",
        });

        if (!response.success) {
            throw new Error(
                response.message || "Failed to search patients, unknown error.",
            );
        }

        return response;
    },

    async checkDuplicatePatients(patientData) {
        const response = await pb.send(`/api/patients/check-duplicates`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(patientData),
        });

        if (!response.success) {
            throw new Error(
                response.message ||
                    "Failed to check duplicates, unknown error.",
            );
        }

        return response;
    },

    async createUserWithRole(userData) {
        const response = await pb.send(
            `/api/users/create-with-role-validation`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            },
        );

        if (!response.success) {
            throw new Error(
                response.message || "Failed to create user, unknown error.",
            );
        }

        return response;
    },

    async updateUserRole(userId, role) {
        const response = await pb.send(`/api/users/${userId}/update-role`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ role }),
        });

        if (!response.success) {
            throw new Error(
                response.message ||
                    "Failed to update user role, unknown error.",
            );
        }

        return response;
    },

    async bulkCreateOtDays(otListId, dates, disabled = false) {
        const response = await pb.send(`/api/ot-days/bulk-create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: pb.authStore.token,
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

    async toggleOtDayStatus(otDayId, disabled, remarks = "") {
        const response = await pb.send(
            `/api/ot-days/${otDayId}/toggle-status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: pb.authStore.token,
                },
                body: JSON.stringify({ disabled, remarks }),
            },
        );

        if (!response.success) {
            throw new Error(
                response.message ||
                    "Failed to toggle OT day status, unknown error.",
            );
        }

        return response;
    },
};
