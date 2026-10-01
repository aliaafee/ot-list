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

        return response.pacStatus;
    },

    /**
     * Tick, untick or comment on one checklist item.
     *
     * `checked` and `comment` are independent - omit one to leave that side
     * alone. The server stamps who and when for whichever is sent, which is
     * why this is a route rather than a collection update.
     */
    async setChecklistItem(itemId, { checked, comment } = {}) {
        const payload = { itemId };
        if (checked !== undefined) payload.checked = checked;
        if (comment !== undefined) payload.comment = comment;

        const response = await pb.send(`/api/set-checklist-item`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.success) {
            throw new Error(
                response.message || "Failed to update checklist item.",
            );
        }

        return response.item;
    },

    /**
     * Add a one-off item to a single procedure's checklist.
     *
     * Marked custom server-side, so a later code change leaves it alone rather
     * than sweeping it away as no longer matching any template.
     */
    async addChecklistItem(procedureId, { label, group, required, hint } = {}) {
        const response = await pb.send(`/api/add-checklist-item`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                procedureId,
                label,
                group,
                required,
                hint,
            }),
        });

        if (!response.success) {
            throw new Error(
                response.message || "Failed to add checklist item.",
            );
        }

        return response.item;
    },

    /** Delete a custom checklist item. Template items are not removable. */
    async removeChecklistItem(itemId) {
        const response = await pb.send(`/api/remove-checklist-item`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ itemId }),
        });

        if (!response.success) {
            throw new Error(
                response.message || "Failed to remove checklist item.",
            );
        }

        return true;
    },

    /**
     * What a checklist would assemble to for these concepts, for the template
     * authoring page. Runs the same assembly as the write paths, so the answer
     * is the one a procedure would actually get.
     */
    async previewChecklist(conceptIds, patient) {
        const response = await pb.send(`/api/preview-checklist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ conceptIds, patient }),
        });

        if (!response.success) {
            throw new Error(response.message || "Failed to preview checklist.");
        }

        return response;
    },

    /**
     * Every checklist template with its items, as the JSON export file.
     * Sites and concepts are catalogue ids, so the file imports into another
     * database.
     */
    async exportChecklistTemplates() {
        return await pb.send(`/api/export-checklist-templates`, {
            method: "GET",
        });
    },

    /**
     * Import templates from an export file. With `dryRun`, nothing is written
     * and the result says what would happen. Validation problems come back in
     * `errors` rather than as a thrown error - the caller shows them - and
     * nothing is written when there are any.
     *
     * @returns {Promise<Object>} { success, created, templates, skipped,
     *   warnings, errors }
     */
    async importChecklistTemplates(file, { dryRun = false, inactive = false } = {}) {
        return await pb.send(`/api/import-checklist-templates`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ file, dryRun, inactive }),
        });
    },

    /**
     * Edit a patient. A route rather than a collection update, because a date
     * of birth or sex entered where it was missing rebuilds the patient's
     * today and future checklists in the same transaction.
     */
    async updatePatient(id, changes) {
        const response = await pb.send(`/api/update-patient`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id, changes }),
        });

        if (!response.success) {
            throw new Error(response.message || "Failed to update patient.");
        }

        return response.patient;
    },

    /**
     * Rebuild one procedure's checklist from its current codes, day, patient
     * and templates. Ticks and comments survive. Returns what changed:
     * { added, removed, madeInapplicable, restored }.
     */
    async rebuildChecklist(procedureId) {
        const response = await pb.send(`/api/rebuild-checklist`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ procedureId }),
        });

        if (!response.success) {
            throw new Error(response.message || "Failed to rebuild checklist.");
        }

        return response;
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
