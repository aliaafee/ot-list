import { useState, useEffect } from "react";
import {
    ChevronLeft,
    ChevronLeftIcon,
    ChevronRightIcon,
    SearchIcon,
    XIcon,
} from "lucide-react";
import BodyLayout from "@/components/body-layout";
import { ToolBar, ToolBarButtonLabel, ToolBarLink } from "@/components/toolbar";
import { pb } from "@/lib/pb";
import { age } from "@/utils/dates";

function Patients({}) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const pageSize = 50;

    useEffect(() => {
        fetchPatients(page, searchQuery);
    }, [page]);

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
        setPage(1);
        fetchPatients(1, searchQuery);
    };

    const handleClearSearch = () => {
        setSearchQuery("");
        setPage(1);
        fetchPatients(1, "");
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
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
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
                                    <tr
                                        key={patient.id}
                                        className="hover:bg-gray-50"
                                    >
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
                                    onClick={() => setPage(page - 1)}
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
                                    onClick={() => setPage(page + 1)}
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
