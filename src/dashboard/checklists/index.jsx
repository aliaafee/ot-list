import { ListChecksIcon } from "lucide-react";

import TemplateDetail from "./template-detail";
import TemplateList from "./template-list";

/**
 * Checklists - the templates a procedure's checklist is assembled from.
 *
 * Admin only: templates are admin-write, and a page hidden entirely reads
 * better than one shown read-only. See specs/checklists/README.md.
 */
export default {
    title: "Checklists",
    icon: <ListChecksIcon width={16} height={16} />,
    adminOnly: true,
    detail: {
        collection: "checklistTemplates",
        titleField: "name",
        newTitle: "New template",
        content: TemplateDetail,
    },
    content: TemplateList,
};
