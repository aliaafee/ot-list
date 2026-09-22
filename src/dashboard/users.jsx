import { UsersIcon } from "lucide-react";

import EditUser from "@/components/edit-user";

/**
 * Users - the accounts that can sign in, and their roles.
 *
 * adminOnly, so the page is hidden from everyone else. The users collection
 * rules are what actually enforce that; this only keeps it out of the way.
 */
export default {
    title: "Users",
    icon: <UsersIcon width={16} height={16} />,
    adminOnly: true,
    content: () => <EditUser />,
};
