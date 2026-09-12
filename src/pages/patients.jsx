import { useState, useEffect, Fragment } from "react";
import { useSearchParams } from "react-router";
import {
    ChevronLeft,
    ChevronLeftIcon,
    ChevronRightIcon,
    SearchIcon,
    XIcon,
    ChevronDownIcon,
} from "lucide-react";
import BodyLayout from "@/components/body-layout";
import { ToolBar, ToolBarButtonLabel, ToolBarLink } from "@/components/toolbar";
import { pb } from "@/lib/pb";
import { age } from "@/utils/dates";
import { twMerge } from "tailwind-merge";
import PatientProcedures from "@/components/patient-procedures";
import LabelValue from "@/components/label-value";

const PAGE_SIZE = 50;

const Tools = () => (
    <ToolBar>
        <ToolBarLink title="Home" to="/">
            <ChevronLeft width={16} height={16} />
            <ToolBarButtonLabel>Home</ToolBarButtonLabel>
        </ToolBarLink>
    </ToolBar>
);

/** Value that only updates once it has stopped changing for `delay` ms. */
function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

function Patients() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(1);

    const [expandedPatientId, setExpandedPatientId] = useState(null);

    // URL is the source of truth. The input reflects `searchQuery` immediately;
    // the fetch waits for `debouncedSearch` so typing doesn't fire a request
    // per keystroke.
    const page = parseInt(searchParams.get("page") || "1", 10);
    const searchQuery = searchParams.get("search") || "";
    const trimmedSearch = searchQuery.trim();
    const debouncedSearch = useDebouncedValue(trimmedSearch);

    const fetchPatients = async (pageNumber, query) => {
        setLoading(true);
        setError(null);
        // A new list makes any open expansion stale.
        setExpandedPatientId(null);

        try {
            const options = {
                sort: "-created",
                requestKey: "patients-list",
            };

            if (query) {
                options.filter = pb.filter(
                    "nid ~ {:q} || hospitalId ~ {:q} || name ~ {:q} || phone ~ {:q}",
                    { q: query },
                );
            }

            const result = await pb
                .collection("patients")
                .getList(pageNumber, PAGE_SIZE, options);

            setPatients(result.items);
            setTotalPages(result.totalPages);
            setLoading(false);
        } catch (err) {
            // A newer request cancelled this one; it now owns `loading`.
            if (err?.isAbort) return;
            console.error("Error fetching patients:", err);
            setError({ message: "Failed to load patients. Please try again." });
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchPatients(page, debouncedSearch);
    }, [page, debouncedSearch]);

    const setSearch = (value) => {
        const params = new URLSearchParams(searchParams);
        if (value.trim()) params.set("search", value);
        else params.delete("search");
        params.set("page", "1");
        setSearchParams(params);
    };

    const handleClearSearch = () => {
        const params = new URLSearchParams(searchParams);
        params.delete("search");
        params.set("page", "1");
        setSearchParams(params);
    };

    const goToPage = (n) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", String(n));
        setSearchParams(params);
    };

    const handleTogglePatient = (patient) => {
        setExpandedPatientId((current) =>
            current === patient.id ? null : patient.id,
        );
    };

    return (
        <BodyLayout header={<Tools />}>
            <h1 className="mb-2 text-xl">Patients</h1>

            {/* Search Box */}
            <div className="mb-4 flex gap-2">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by NID, Hospital ID, Name, or Phone"
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
                    onClick={() => setSearch(searchQuery.trim())}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-2 py-1 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50"
                >
                    <SearchIcon width={16} height={16} className="mr-2" />
                    Search
                </button>
            </div>

            {error && (
                <div className="bg-red-400/20 rounded-md p-2 mb-4 text-sm">
                    {error.message}
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-gray-500">
                    Loading patients...
                </div>
            ) : patients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    {debouncedSearch
                        ? `No patients match "${debouncedSearch}".`
                        : "No patients found."}
                </div>
            ) : (
                <>
                    <div className="border border-gray-300 rounded-md overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        NID
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Hospital ID
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Name
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Age/Sex
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Phone
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Address
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {patients.map((patient) => {
                                    const expanded =
                                        expandedPatientId === patient.id;
                                    return (
                                        <Fragment key={patient.id}>
                                            <tr
                                                className={twMerge(
                                                    "cursor-pointer",
                                                    expanded
                                                        ? "bg-blue-300"
                                                        : "hover:bg-blue-200",
                                                )}
                                                onClick={() =>
                                                    handleTogglePatient(patient)
                                                }
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" ||
                                                        e.key === " "
                                                    ) {
                                                        e.preventDefault();
                                                        handleTogglePatient(
                                                            patient,
                                                        );
                                                    }
                                                }}
                                                tabIndex={0}
                                                aria-expanded={expanded}
                                            >
                                                <td className="px-3 py-2 text-sm">
                                                    {expanded ? (
                                                        <ChevronDownIcon
                                                            width={16}
                                                            height={16}
                                                        />
                                                    ) : (
                                                        <ChevronRightIcon
                                                            width={16}
                                                            height={16}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    <LabelValue
                                                        value={patient.nid}
                                                        copyButton={true}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    <LabelValue
                                                        value={
                                                            patient.hospitalId
                                                        }
                                                        copyButton={true}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    {patient.name}
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    {age(patient.dateOfBirth)} /{" "}
                                                    {patient.sex?.[0]?.toUpperCase() ||
                                                        ""}
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    {patient.phone}
                                                </td>
                                                <td className="px-3 py-2 text-sm">
                                                    {patient.address}
                                                </td>
                                            </tr>
                                            {expanded && (
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="px-3 py-3"
                                                    >
                                                        <PatientProcedures
                                                            patientId={
                                                                patient.id
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
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
                                    onClick={() => goToPage(page - 1)}
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
                                    onClick={() => goToPage(page + 1)}
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

export default Patients;
