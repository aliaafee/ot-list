import { useCallback, useEffect, useMemo, useState } from "react";

import { pb } from "@/lib/pb";
import { findKeyOverlaps } from "@/lib/checklists";

/**
 * The item keys this template shares with another under overlapping patient
 * criteria (see findKeyOverlaps), and how many items it has.
 *
 * Reads every template and every item key, so `reload` should be called when
 * this template's items change. Idle while creating: a template that does not
 * exist yet has no items.
 *
 * @param {object|null} record - The saved template, null when creating
 * @param {object} template - The local copy, whose criteria are being edited
 */
export default function useKeyOverlaps(record, template) {
    const creating = !record;
    const [allTemplates, setAllTemplates] = useState([]);
    const [allKeys, setAllKeys] = useState([]);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (creating) return;
        let ignore = false;
        (async () => {
            try {
                const [templateRecords, keyRecords] = await Promise.all([
                    pb.collection("checklistTemplates").getFullList({
                        fields: "id,name,scope,sexes,ageMinMonths,ageMaxMonths",
                        requestKey: "checklist-admin-overlap-templates",
                    }),
                    pb.collection("checklistTemplateItems").getFullList({
                        fields: "itemKey,template",
                        requestKey: "checklist-admin-overlap-keys",
                    }),
                ]);
                if (ignore) return;
                setAllTemplates(templateRecords);
                setAllKeys(keyRecords);
            } catch (err) {
                // A warning is a convenience; editing still works.
                console.error("Error loading key overlaps:", err);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [creating, version]);

    const overlaps = useMemo(
        () =>
            creating
                ? []
                : findKeyOverlaps(template, record.id, allTemplates, allKeys),
        [creating, template, allTemplates, allKeys, record],
    );

    const itemCount = creating
        ? 0
        : allKeys.filter((key) => key.template === record.id).length;

    const reload = useCallback(() => setVersion((v) => v + 1), []);

    return { overlaps, itemCount, reload };
}
