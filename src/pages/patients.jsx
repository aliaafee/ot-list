import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
    ChevronLeft,
    ChevronLeftIcon,
    ChevronRightIcon,
    SearchIcon,
    XIcon,
    ChevronDownIcon,
    Trash,
} from "lucide-react";
import BodyLayout from "@/components/body-layout";
import { ToolBar, ToolBarButtonLabel, ToolBarLink } from "@/components/toolbar";
import { pb } from "@/lib/pb";
import { age } from "@/utils/dates";
import dayjs from "dayjs";
import { useAuth } from "@/contexts/auth-context";
import { twMerge } from "tailwind-merge";

function Patients({}) {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [expandedPatient, setExpandedPatient] = useState(null);
    const [patientProcedures, setPatientProcedures] = useState([]);
    const [loadingProcedures, setLoadingProcedures] = useState(false);
    const pageSize = 50;

    // Get page and search from URL, with defaults
    const page = parseInt(searchParams.get("page") || "1", 10);
    const searchQuery = searchParams.get("search") || "";

    useEffect(() => {
        fetchPatients(page, searchQuery);
    }, [page, searchQuery]);

    const fetchPatients = async (pageNumber, query = "") => {
        setLoading(true);
        setError(null);

        try {
            const options = {
                sort: "-created",
            };

            if (query.trim()) {
                options.filter = `nid ~ "${query}" || hospitalId ~ "${query}" || name ~ "${query}" || phone ~ "${query}"`;
            }

            const result = await pb
                .collection("patients")
                .getList(pageNumber, pageSize, options);

            setPatients(result.items);
            setTotalPages(result.totalPages);
        } catch (err) {
            console.error("Error fetching patients:", err);
            setError({
                message: "Failed to load patients. Please try again.",
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

    const loadPatientProcedures = async (patient) => {
        setExpandedPatient(patient);
        setLoadingProcedures(true);

        try {
            const result = await pb.collection("procedures").getList(1, 100, {
                filter: `patient = "${patient.id}"`,
                sort: "-created",
                expand: "procedureDay,procedureDay.otList,addedBy,operatingRoom",
            });

            setPatientProcedures(result.items);
        } catch (err) {
            console.error("Error fetching procedures:", err);
            setPatientProcedures([]);
        } finally {
            setLoadingProcedures(false);
        }
    };

    const handleTogglePatient = (patient) => {
        if (expandedPatient?.id === patient.id) {
            setExpandedPatient(null);
            setPatientProcedures([]);
        } else {
            loadPatientProcedures(patient);
        }
    };

    const handleDeleteProcedure = async (procedureId, patientId) => {
        if (
            !window.confirm(
                "Are you sure you want to delete this procedure? This action cannot be undone."
            )
        ) {
            return;
        }

        try {
            await pb.collection("procedures").delete(procedureId);

            // Refresh the procedures list for the current patient
            if (expandedPatient) {
                const result = await pb
                    .collection("procedures")
                    .getList(1, 100, {
                        filter: `patient = "${patientId}"`,
                        sort: "-created",
                        expand: "procedureDay,procedureDay.otList,addedBy,operatingRoom",
                    });

                setPatientProcedures(result.items);
            }
        } catch (err) {
            console.error("Error deleting procedure:", err);
            alert("Failed to delete procedure. Please try again.");
        }
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
            <h1 className="mb-2 text-xl">Patients</h1>

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
                        placeholder="Search by NID, Hospital ID, Name, or Phone"
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
                    No patients found.
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
                                {patients.map((patient) => (
                                    <>
                                        <tr
                                            key={patient.id}
                                            className={twMerge(
                                                " cursor-pointer",
                                                expandedPatient?.id ===
                                                    patient.id
                                                    ? "bg-blue-300"
                                                    : "hover:bg-blue-200"
                                            )}
                                            onClick={() =>
                                                handleTogglePatient(patient)
                                            }
                                        >
                                            <td className="px-3 py-2 text-sm">
                                                {expandedPatient?.id ===
                                                patient.id ? (
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
                                                {patient.nid}
                                            </td>
                                            <td className="px-3 py-2 text-sm">
                                                {patient.hospitalId}
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
                                        {expandedPatient?.id === patient.id && (
                                            <tr key={`${patient.id}-details`}>
                                                <td
                                                    colSpan="7"
                                                    className="px-3 py-3 bg-blue-50"
                                                >
                                                    <div className="pl-8">
                                                        <h3 className="text-sm font-semibold mb-2">
                                                            Procedures
                                                        </h3>
                                                        {loadingProcedures ? (
                                                            <div className="text-sm text-gray-500">
                                                                Loading
                                                                procedures...
                                                            </div>
                                                        ) : patientProcedures.length ===
                                                          0 ? (
                                                            <div className="text-sm text-gray-500">
                                                                No procedures
                                                                found for this
                                                                patient.
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {patientProcedures.map(
                                                                    (proc) => (
                                                                        <div
                                                                            key={
                                                                                proc.id
                                                                            }
                                                                            className="border border-gray-200 rounded-md p-2 bg-white text-sm relative"
                                                                        >
                                                                            {user?.role ===
                                                                                "admin" && (
                                                                                <button
                                                                                    onClick={() =>
                                                                                        handleDeleteProcedure(
                                                                                            proc.id,
                                                                                            patient.id
                                                                                        )
                                                                                    }
                                                                                    className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                    title="Delete procedure"
                                                                                >
                                                                                    <Trash
                                                                                        size={
                                                                                            16
                                                                                        }
                                                                                    />
                                                                                </button>
                                                                            )}
                                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                                <div>
                                                                                    <span className="font-medium">
                                                                                        Date:
                                                                                    </span>{" "}
                                                                                    {proc
                                                                                        .expand
                                                                                        ?.procedureDay
                                                                                        ?.date
                                                                                        ? dayjs(
                                                                                              proc
                                                                                                  .expand
                                                                                                  .procedureDay
                                                                                                  .date
                                                                                          ).format(
                                                                                              "DD MMM YYYY"
                                                                                          )
                                                                                        : "N/A"}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-medium">
                                                                                        OT
                                                                                        List:
                                                                                    </span>{" "}
                                                                                    {proc
                                                                                        .expand
                                                                                        ?.procedureDay
                                                                                        ?.expand
                                                                                        ?.otList
                                                                                        ?.name ||
                                                                                        "N/A"}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-medium">
                                                                                        Room:
                                                                                    </span>{" "}
                                                                                    {proc
                                                                                        .expand
                                                                                        ?.operatingRoom
                                                                                        ?.name ||
                                                                                        "N/A"}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-medium">
                                                                                        Bed:
                                                                                    </span>{" "}
                                                                                    {proc.bed ||
                                                                                        "N/A"}
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-1">
                                                                                <span className="font-medium">
                                                                                    Diagnosis:
                                                                                </span>{" "}
                                                                                {
                                                                                    proc.diagnosis
                                                                                }
                                                                            </div>
                                                                            <div className="mt-1">
                                                                                <span className="font-medium">
                                                                                    Procedure:
                                                                                </span>{" "}
                                                                                {
                                                                                    proc.procedure
                                                                                }
                                                                            </div>
                                                                            {proc.comorbids && (
                                                                                <div className="mt-1">
                                                                                    <span className="font-medium">
                                                                                        Comorbidities:
                                                                                    </span>{" "}
                                                                                    {
                                                                                        proc.comorbids
                                                                                    }
                                                                                </div>
                                                                            )}
                                                                            <div className="mt-1 grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                                <div>
                                                                                    <span className="font-medium">
                                                                                        Anesthesia:
                                                                                    </span>{" "}
                                                                                    {proc.anesthesia ||
                                                                                        "N/A"}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-medium">
                                                                                        Duration:
                                                                                    </span>{" "}
                                                                                    {proc.duration
                                                                                        ? `${proc.duration} min`
                                                                                        : "N/A"}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="font-medium">
                                                                                        Added
                                                                                        By:
                                                                                    </span>{" "}
                                                                                    {proc
                                                                                        .expand
                                                                                        ?.addedBy
                                                                                        ?.name ||
                                                                                        "N/A"}
                                                                                </div>
                                                                            </div>
                                                                            {proc.removed && (
                                                                                <div className="mt-1 text-red-600 font-medium">
                                                                                    [REMOVED]
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
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

export default Patients;
