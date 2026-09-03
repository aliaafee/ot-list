import { useState, useEffect, useMemo } from "react";
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
import {
    describeProcedureCodes,
    UNCODED_CONCEPT_ID,
} from "@/lib/procedure-codes";
import { FACET_LABELS } from "@/lib/procedure-catalogue";
import { useCatalogue } from "@/contexts/catalogue-context";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";

// A concept facet, its relation field on `procedureConcepts`, and the URL param
// its filter value is kept in. Filtering a procedure means "at least one of its
// procedure codes has a concept with this facet term" - hence the `?=` operator
// across the has-many `procedureCodes_via_procedure` back-relation.
const FACETS = [
    { key: "method", field: "method" },
    { key: "procedureSite", field: "procedureSite" },
    { key: "surgicalApproach", field: "surgicalApproach" },
    { key: "device", field: "device" },
    { key: "morphology", field: "morphology" },
    { key: "intent", field: "defaultIntent" },
];
const facetParam = (key) => `f_${key}`;

// Current PAC status lives directly on `procedures.pacStatus` (kept in step with
// the procedurePacStatuses timeline by the add-pac-status hook), so it filters
// as a plain field. "none" matches procedures with no PAC status recorded yet.
const PAC_STATUS_OPTIONS = [
    { value: "referred", label: "Referred" },
    { value: "inReview", label: "In Review" },
    { value: "cleared", label: "Cleared" },
    { value: "unfit", label: "Unfit" },
    { value: "none", label: "No PAC status" },
];

const Tools = () => (
    <ToolBar>
        <ToolBarLink title="Home" to="/">
            <ChevronLeft width={16} height={16} />
            <ToolBarButtonLabel>Home</ToolBarButtonLabel>
        </ToolBarLink>
    </ToolBar>
);

function AllProcedures() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [procedures, setProcedures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 50;

    const { concepts } = useCatalogue();

    // Get page and search from URL, with defaults
    const page = parseInt(searchParams.get("page") || "1", 10);
    // What the input shows, as typed; the trimmed form is what actually gets
    // searched, so " nid " and "nid" don't run as different queries.
    const searchQuery = searchParams.get("search") || "";
    const trimmedSearch = searchQuery.trim();
    const showUpcoming = searchParams.get("upcoming") === "true";
    const showRemoved = searchParams.get("showRemoved") === "true";
    const uncodedOnly = searchParams.get("uncoded") === "true";
    const pacStatus = searchParams.get("pac") || "";

    // The selected facet term per facet, from the URL. `facetKey` is a stable
    // string of them, so the fetch effect re-runs when any changes without
    // taking a fresh object as a dependency.
    const facetFilters = FACETS.reduce((acc, { key }) => {
        acc[key] = searchParams.get(facetParam(key)) || "";
        return acc;
    }, {});
    const facetKey = FACETS.map(({ key }) => facetFilters[key]).join("|");
    const hasFacetFilters = facetKey.replace(/\|/g, "") !== "";

    // The terms actually in use for each facet, so a filter never offers a
    // value that would match nothing.
    const facetOptions = useMemo(() => {
        const sets = Object.fromEntries(
            FACETS.map(({ key }) => [key, new Set()]),
        );
        for (const concept of concepts) {
            if (!concept.active) continue;
            for (const { key } of FACETS) {
                const term = concept.facets?.[key];
                if (term) sets[key].add(term);
            }
        }
        return Object.fromEntries(
            Object.entries(sets).map(([key, set]) => [
                key,
                [...set].sort((a, b) => a.localeCompare(b)),
            ]),
        );
    }, [concepts]);

    const fetchProcedures = async (
        pageNumber,
        query = "",
        upcoming = false,
        includeRemoved = false,
        facets = {},
        onlyUncoded = false,
        pac = "",
    ) => {
        setLoading(true);
        setError(null);

        try {
            const options = {
                sort: "procedureDay.date",
                expand: "patient,addedBy,procedureDay,procedureDay.otList,operatingRoom,procedureCodes_via_procedure.concept,procedureCodes_via_procedure.spinalLevels",
            };

            const filters = [];

            const term = query.trim();
            if (term) {
                filters.push(
                    `(patient.nid ~ "${term}" || patient.hospitalId ~ "${term}" || patient.name ~ "${term}" || diagnosis ~ "${term}" || procedure ~ "${term}")`,
                );
            }

            if (upcoming) {
                const today = dayjs().format("YYYY-MM-DD");
                filters.push(`procedureDay.date >= "${today}"`);
            }

            if (!includeRemoved) {
                filters.push(`removed = false`);
            }

            for (const { key, field } of FACETS) {
                const term = facets[key];
                if (!term) continue;
                filters.push(
                    pb.filter(
                        `procedureCodes_via_procedure.concept.${field}.term ?= {:term}`,
                        { term },
                    ),
                );
            }

            // Procedures still carrying the uncoded sentinel - the coverage gap
            // the catalogue custodian works through (spec section 8).
            if (onlyUncoded) {
                filters.push(
                    pb.filter(
                        `procedureCodes_via_procedure.concept.conceptId ?= {:uncoded}`,
                        { uncoded: UNCODED_CONCEPT_ID },
                    ),
                );
            }

            // Current PAC status. "none" is procedures with none recorded yet.
            if (pac === "none") {
                filters.push(`pacStatus = ""`);
            } else if (pac) {
                filters.push(pb.filter(`pacStatus = {:pac}`, { pac }));
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

    useEffect(() => {
        // A data-fetching effect: fetchProcedures owns the loading/error state
        // for the request it runs. That is the intended shape, not a cascading
        // render to design away.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchProcedures(
            page,
            trimmedSearch,
            showUpcoming,
            showRemoved,
            facetFilters,
            uncodedOnly,
            pacStatus,
        );
        // facetKey stands in for facetFilters, which is a fresh object each render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        trimmedSearch,
        showUpcoming,
        showRemoved,
        facetKey,
        uncodedOnly,
        pacStatus,
    ]);

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams);
        if (searchQuery.trim()) {
            params.set("search", searchQuery.trim());
        } else {
            params.delete("search");
        }
        params.set("page", "1");
        setSearchParams(params);
    };

    const handleClearSearch = () => {
        const params = new URLSearchParams(searchParams);
        params.delete("search");
        params.set("page", "1");
        setSearchParams(params);
    };

    const setParam = (name, value) => {
        const params = new URLSearchParams(searchParams);
        if (value) params.set(name, value);
        else params.delete(name);
        params.set("page", "1");
        setSearchParams(params);
    };

    const setFacet = (key, value) => setParam(facetParam(key), value);

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams);
        for (const { key } of FACETS) params.delete(facetParam(key));
        params.delete("pac");
        params.set("page", "1");
        setSearchParams(params);
    };

    const hasFilters = hasFacetFilters || pacStatus !== "";

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
                            className="absolute right-2 top-4 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
            <div className="mb-4 flex flex-wrap gap-4">
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
                        Upcoming only
                    </span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showRemoved}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams);
                            if (e.target.checked) {
                                params.set("showRemoved", "true");
                            } else {
                                params.delete("showRemoved");
                            }
                            params.set("page", "1");
                            setSearchParams(params);
                        }}
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        Show removed
                    </span>
                </label>
                <label className="flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={uncodedOnly}
                        onChange={(e) => {
                            const params = new URLSearchParams(searchParams);
                            if (e.target.checked) {
                                params.set("uncoded", "true");
                            } else {
                                params.delete("uncoded");
                            }
                            params.set("page", "1");
                            setSearchParams(params);
                        }}
                        className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                        Uncoded only
                    </span>
                </label>
            </div>

            {/* PAC status and procedure concept facet filters */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <select
                    value={pacStatus}
                    onChange={(e) => setParam("pac", e.target.value)}
                    className={twMerge(
                        "px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                        pacStatus
                            ? "border-blue-400 text-blue-700"
                            : "border-gray-300 text-gray-700",
                    )}
                >
                    <option value="">PAC status: any</option>
                    {PAC_STATUS_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
                {FACETS.map(({ key }) => (
                    <select
                        key={key}
                        value={facetFilters[key]}
                        onChange={(e) => setFacet(key, e.target.value)}
                        className={twMerge(
                            "px-2 py-1 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
                            facetFilters[key]
                                ? "border-blue-400 text-blue-700"
                                : "border-gray-300 text-gray-700",
                        )}
                    >
                        <option value="">{FACET_LABELS[key]}: any</option>
                        {facetOptions[key].map((term) => (
                            <option key={term} value={term}>
                                {term}
                            </option>
                        ))}
                    </select>
                ))}
                {hasFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm text-blue-600 hover:underline cursor-pointer"
                    >
                        Clear filters
                    </button>
                )}
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
                                        NID
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Name
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Diagnosis
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Procedure
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        List
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
                                        className={twMerge(
                                            "hover:bg-blue-200 group",
                                            proc?.removed && "line-through",
                                        )}
                                    >
                                        <td className="px-1.5 py-0.5 text-sm  ">
                                            <Link
                                                to={
                                                    proc?.removed
                                                        ? `/lists/${proc.procedureDay}?procedureId=${proc.id}&scrollTo=${proc.id}&showRemoved=true`
                                                        : `/lists/${proc.procedureDay}?procedureId=${proc.id}&scrollTo=${proc.id}`
                                                }
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
                                                proc.expand?.procedureDay?.date,
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
                                            {describeProcedureCodes(proc).join(" + ")}
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
                                            searchParams,
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
                                            searchParams,
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
