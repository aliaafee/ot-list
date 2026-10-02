import { Link } from "react-router";
import { ChevronRightIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import { SCOPE_LABEL, criteriaCount, describeCriteria } from "@/lib/checklists";

const COLUMNS = ["Name", "Applies to", "Patients", "Order", "Status"];

/** The template list, each row linking to its template. */
export default function TemplatesTable({ templates }) {
    return (
        <div className="border border-gray-300 rounded-md overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                    <tr>
                        {COLUMNS.map((column) => (
                            <th
                                key={column}
                                className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                            >
                                {column}
                            </th>
                        ))}
                        <th className="px-3 py-2 w-8"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {templates.map((template) => (
                        <tr key={template.id} className="hover:bg-blue-200">
                            <td className="px-3 py-2 text-sm">
                                <Link
                                    to={`/settings/checklists/${template.id}`}
                                    className="text-blue-700 hover:underline"
                                >
                                    {template.name}
                                </Link>
                                {!!template.description && (
                                    <p className="text-xs text-gray-500">
                                        {template.description}
                                    </p>
                                )}
                            </td>
                            <td className="px-3 py-2 text-sm">
                                {SCOPE_LABEL[template.scope] || template.scope}
                            </td>
                            <td
                                className={twMerge(
                                    "px-3 py-2 text-sm",
                                    !criteriaCount(template) && "text-gray-500",
                                )}
                            >
                                {describeCriteria(template) || "Any"}
                            </td>
                            <td className="px-3 py-2 text-sm">
                                {template.position}
                            </td>
                            <td
                                className={twMerge(
                                    "px-3 py-2 text-sm",
                                    !template.active && "text-gray-500",
                                )}
                            >
                                {template.active ? "Active" : "Inactive"}
                            </td>
                            <td className="px-3 py-2 text-sm">
                                <Link
                                    to={`/settings/checklists/${template.id}`}
                                    title={`Open ${template.name}`}
                                    className="inline-flex p-1.5 rounded-full hover:bg-gray-400"
                                >
                                    <ChevronRightIcon size={16} />
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
