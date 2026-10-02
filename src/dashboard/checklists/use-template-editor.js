import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { pb } from "@/lib/pb";
import { SCOPE_TARGET, SEXES, TARGET_FIELDS } from "@/lib/checklists";

/**
 * What /settings/checklists/new starts from. Inactive, so a template does
 * nothing until it has been given its items and switched on.
 */
const BLANK_TEMPLATE = {
    name: "",
    description: "",
    scope: "all",
    position: 0,
    active: false,
    subspecialties: [],
    sites: [],
    concepts: [],
    sexes: [],
    ageMinMonths: 0,
    ageMaxMonths: 0,
};

/**
 * The local copy of one template's properties and the ways to change it.
 *
 * An existing template is written as it is changed: a discrete choice
 * (`change`) at once, a typed field (`edit`) when it is left (`commit`). A new
 * one is held until `create`, because it does not exist yet and `name` is
 * required.
 *
 * @param {object|null} record - The saved template, null when creating
 */
export default function useTemplateEditor(record) {
    const creating = !record;
    const navigate = useNavigate();

    const [template, setTemplate] = useState(record ?? BLANK_TEMPLATE);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    // Writes still in flight - a count, since a blur and a select can
    // overlap - and whether the last one landed, shown for a moment.
    const [updating, setUpdating] = useState(0);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!saved) return;
        const timer = setTimeout(() => setSaved(false), 2000);
        return () => clearTimeout(timer);
    }, [saved]);

    // The local copy moves first so a select does not snap back while the
    // write is in flight.
    const persist = async (patch) => {
        const previous = template;
        setTemplate((current) => ({ ...current, ...patch }));
        setError("");
        setSaved(false);
        setUpdating((n) => n + 1);
        try {
            await pb.collection("checklistTemplates").update(record.id, patch, {
                requestKey: "checklist-admin-template-save",
            });
            setSaved(true);
        } catch (err) {
            console.error("Error saving template:", err);
            setTemplate(previous);
            setError(err?.message || "Failed to save the change.");
        } finally {
            setUpdating((n) => n - 1);
        }
    };

    /** A discrete choice: written as soon as it is made. */
    const change = (patch) => {
        if (creating) setTemplate((cur) => ({ ...cur, ...patch }));
        else persist(patch);
    };

    /** Typed into: held locally, written when the field is left. */
    const edit = (field) => (e) =>
        setTemplate((cur) => ({ ...cur, [field]: e.target.value }));

    const commit =
        (field, coerce = (v) => v, { required = false } = {}) =>
        () => {
            if (creating) return;
            const value = coerce(template[field]);
            if (value === record[field]) return;
            // A required field cannot be emptied, and the write would only
            // be rejected: put back what was there and say so, rather than
            // leaving the box blank under an error.
            if (required && !value) {
                setTemplate((cur) => ({ ...cur, [field]: record[field] }));
                setError(`A template needs a ${field}.`);
                return;
            }
            persist({ [field]: value });
        };

    // Changing scope clears the other two targets rather than leaving them as
    // orphans that silently never match - spec section 8.2.
    const changeScope = (scope) =>
        change({
            scope,
            ...Object.fromEntries(
                TARGET_FIELDS.filter(
                    (field) => field !== SCOPE_TARGET[scope]?.field,
                ).map((field) => [field, []]),
            ),
        });

    // Refusing every sex rather than saving it: it looks like "any sex" but
    // counts as a criterion in dedupe, and if the patients vocabulary gains a
    // value, a template meant for everyone would silently stop matching those
    // patients - spec section 8.2.
    const changeSexes = (sexes) => {
        if (sexes.length >= SEXES.length) {
            setError(
                "Leave sex empty to mean any sex, rather than choosing every option.",
            );
            return;
        }
        setError("");
        change({ sexes });
    };

    /** One age bound, in months. False refuses it. */
    const changeAge = (field, months) => {
        if (months === null) {
            setError("Age must be a whole number of months or years.");
            return false;
        }
        const next = { ...template, [field]: months };
        if (
            next.ageMinMonths > 0 &&
            next.ageMaxMonths > 0 &&
            next.ageMinMonths >= next.ageMaxMonths
        ) {
            setError(
                `"From" must be below "Under" - the upper age is exclusive.`,
            );
            return false;
        }
        setError("");
        change({ [field]: months });
        return true;
    };

    const create = async () => {
        if (!template.name.trim()) {
            setError("A template needs a name.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const created = await pb.collection("checklistTemplates").create({
                ...template,
                name: template.name.trim(),
                position: Number(template.position) || 0,
            });
            // replace, so Back goes to the list rather than to a create form
            // for a template that now exists.
            navigate(`/settings/checklists/${created.id}`, { replace: true });
        } catch (err) {
            console.error("Error creating template:", err);
            setError(err?.message || "Failed to create the template.");
            setSaving(false);
        }
    };

    return {
        template,
        error,
        // Creating
        saving,
        create,
        // Saving an existing template
        updating: updating > 0,
        saved,
        // Editing
        change,
        edit,
        commit,
        changeScope,
        changeSexes,
        changeAge,
    };
}
