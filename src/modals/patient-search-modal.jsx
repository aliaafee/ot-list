import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { pb } from "@/lib/pb";
import ModalWindow from "./modal-window";
import PatientInfo from "@/components/patient-info";
import { age } from "@/utils/dates";

function PatientSearchModal({ onSelect, onCancel }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setPatients([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const filter = `nid ~ "${searchQuery}" || hospitalId ~ "${searchQuery}" || name ~ "${searchQuery}" || phone ~ "${searchQuery}"`;

            const records = await pb.collection("patients").getList(1, 50, {
                filter: filter,
                sort: "-created",
            });

            setPatients(records.items);
        } catch (err) {
            console.error("Error searching patients:", err);
            setError({
                message: "Failed to search patients. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedPatient) {
            onSelect(selectedPatient);
        }
    };

    return (
        <ModalWindow
            title="Find Patient"
            icon={<SearchIcon width={20} height={20} />}
            okLabel="Select"
            onOk={handleConfirm}
            onCancel={onCancel}
            okDisabled={!selectedPatient}
            large={true}
        >
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        name="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by NID, Hospital ID, Name, or Phone"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSearch();
                            }
                        }}
                        className="text-sm py-1 px-2 rounded-md bg-white w-full resize-none border border-gray-300 flex-1"
                    />
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-50"
                    >
                        <SearchIcon width={16} height={16} className="mr-2" />
                        Search
                    </button>
                </div>

                {error && (
                    <div className="bg-red-400/20 rounded-md p-2 text-sm">
                        {error.message}
                    </div>
                )}

                {loading && (
                    <div className="text-center py-4 text-gray-500">
                        Searching...
                    </div>
                )}

                {!loading && patients.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                        No patients found.
                    </div>
                )}

                {!loading && patients.length > 0 && (
                    <div className="border border-gray-300 rounded-md overflow-hidden max-h-96 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Select
                                    </th>
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
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {patients.map((patient) => (
                                    <tr
                                        key={patient.id}
                                        onClick={() =>
                                            setSelectedPatient(patient)
                                        }
                                        className={`cursor-pointer hover:bg-gray-50 ${
                                            selectedPatient?.id === patient.id
                                                ? "bg-blue-50"
                                                : ""
                                        }`}
                                    >
                                        <td className="px-3 py-2 text-sm">
                                            <input
                                                type="radio"
                                                checked={
                                                    selectedPatient?.id ===
                                                    patient.id
                                                }
                                                onChange={() =>
                                                    setSelectedPatient(patient)
                                                }
                                                className="cursor-pointer"
                                            />
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedPatient && (
                    <div>
                        <p className="text-sm font-semibold text-blue-900 mb-2">
                            Selected Patient:
                        </p>
                        <PatientInfo
                            patient={selectedPatient}
                            showAddress={true}
                        />
                    </div>
                )}
            </div>
        </ModalWindow>
    );
}

export default PatientSearchModal;
