import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import {
    ChevronLeft,
    ChevronLeftIcon,
    ChevronRightIcon,
    ExternalLinkIcon,
    SearchIcon,
    XIcon,
} from "lucide-react";
import BodyLayout from "@/components/body-layout";
import { ToolBar, ToolBarButtonLabel, ToolBarLink } from "@/components/toolbar";
import { pb } from "@/lib/pb";
import { age } from "@/utils/dates";
import dayjs from "dayjs";

function AllProcedures() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [procedures, setProcedures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 50;

    // Get page and search from URL, with defaults
    const page = parseInt(searchParams.get("page") || "1", 10);
    const searchQuery = searchParams.get("search") || "";
    const showUpcoming = searchParams.get("upcoming") === "true";

    useEffect(() => {
        fetchProcedures(page, searchQuery, showUpcoming);
    }, [page, searchQuery, showUpcoming]);

    const fetchProcedures = async (
        pageNumber,
        query = "",
        upcoming = false
    ) => {
        setLoading(true);
        setError(null);

        try {
            const options = {
                sort: "-created",
                expand: "patient,addedBy,procedureDay,procedureDay.otList,operatingRoom",
            };

            const filters = [];

            if (query.trim()) {
                filters.push(
                    `(patient.nid ~ "${query}" || patient.hospitalId ~ "${query}" || patient.name ~ "${query}" || diagnosis ~ "${query}" || procedure ~ "${query}")`
                );
            }

            if (upcoming) {
                const today = dayjs().format("YYYY-MM-DD");
                filters.push(`procedureDay.date >= "${today}"`);
            }

            if (filters.length > 0) {
                options.filter = filters.join(" && ");
            }

            const result = await pb
                .collection("procedures")
                .getList(pageNumber, pageSize, options);

            setProcedures(result.items);
            setTotalPages(result.totalPages);
        } catch (err) {
            console.error("Error fetching procedures:", err);
            setError({
                message: "Failed to load procedures. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
            params.set("search", searchQuery.trim());
        }
        params.set("page", "1");
        setSearchParams(params);
    };

    const handleClearSearch = () => {
        setSearchParams({});
    };

    const Tools = () => (
        <ToolBar>
            <ToolBarLink title="Home" to="/">
                <ChevronLeft width={16} height={16} />
                <ToolBarButtonLabel>Home</ToolBarButtonLabel>
            </ToolBarLink>
        </ToolBar>
    );

    return (
        <BodyLayout header={<Tools />}>
            <h1 className="mb-2 text-xl">All Procedures</h1>

            {/* Search Box */}
            <div className="mb-4 flex gap-2">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams);
                            if (e.target.value.trim()) {
                                params.set("search", e.target.value);
                            } else {
                                params.delete("search");
                            }
                            params.set("page", "1");
                            setSearchParams(params);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                        placeholder="Search by Patient NID, Name, Diagnosis, or Procedure"
                        className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={handleClearSearch}
                            className="absolute right-2 top-[16px] -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                            title="Clear search"
                        >
                            <XIcon width={14} height={14} />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50"
                >
                    <SearchIcon width={16} height={16} className="mr-2" />
                    Search
                </button>
            </div>

            {/* Toggle for Upcoming Procedures */}
            <div className="mb-4 flex items-center">
                <label className="flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showUpcoming}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams);
                            if (e.target.checked) {
                                params.set("upcoming", "true");
                            } else {
                                params.delete("upcoming");
                            }
                            params.set("page", "1");
                            setSearchParams(params);
                        }}
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        Show upcoming procedures only
                    </span>
                </label>
            </div>

            {error && (
                <div className="bg-red-400/20 rounded-md p-2 mb-4 text-sm">
                    {error.message}
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-gray-500">
                    Loading procedures...
                </div>
            ) : procedures.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No procedures found.
                </div>
            ) : (
                <>
                    <div className="border border-gray-300 rounded-md overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Date
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Patient NID
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Patient Name
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Diagnosis
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Procedure
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        OT List
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Room
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {procedures.map((proc) => (
                                    <tr
                                        key={proc.id}
                                        className="hover:bg-gray-50 group"
                                    >
                                        <td className="px-1.5 py-0.5 text-sm  ">
                                            <Link
                                                to={`/lists/${proc.procedureDay}?procedureId=${proc.id}`}
                                                className="inline-block rounded-full p-1.5 hover:bg-gray-400"
                                                title="View in List"
                                            >
                                                <ExternalLinkIcon
                                                    width={16}
                                                    height={16}
                                                />
                                            </Link>
                                        </td>
                                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                                            {dayjs(
                                                proc.expand?.procedureDay?.date
                                            ).format("DD MMM YYYY")}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            {proc.expand?.patient?.nid}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            {proc.expand?.patient?.name}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            {proc.diagnosis}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            {proc.procedure}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            {
                                                proc.expand?.procedureDay
                                                    ?.expand?.otList?.name
                                            }
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            {proc.expand?.operatingRoom?.name}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-2">
                            <div className="text-sm text-gray-700">
                                Page <span className="font-medium">{page}</span>{" "}
                                of{" "}
                                <span className="font-medium">
                                    {totalPages}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const params = new URLSearchParams(
                                            searchParams
                                        );
                                        params.set("page", String(page - 1));
                                        setSearchParams(params);
                                    }}
                                    disabled={page === 1}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeftIcon
                                        width={16}
                                        height={16}
                                        className="mr-1"
                                    />
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const params = new URLSearchParams(
                                            searchParams
                                        );
                                        params.set("page", String(page + 1));
                                        setSearchParams(params);
                                    }}
                                    disabled={page === totalPages}
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <ChevronRightIcon
                                        width={16}
                                        height={16}
                                        className="ml-1"
                                    />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </BodyLayout>
    );
}

export default AllProcedures;
