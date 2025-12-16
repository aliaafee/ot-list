import { age } from "@/utils/dates";
import LabelValue from "./label-value";
import { twMerge } from "tailwind-merge";

/**
 * PatientInfo - Display patient information in a formatted grid
 *
 * @param {Object} patient - Patient object containing patient details
 * @param {string} patient.nid - National ID
 * @param {string} patient.hospitalId - Hospital ID
 * @param {string} patient.name - Patient name
 * @param {string} patient.dateOfBirth - Date of birth
 * @param {string} patient.sex - Sex/gender
 * @param {string} patient.phone - Phone number
 * @param {string} patient.address - Address (optional)
 * @param {string} className - Additional CSS classes for the container
 * @param {boolean} showAddress - Whether to display the address field
 */
function PatientInfo({ patient, className = "", showAddress = false }) {
    return (
        <div
            className={twMerge(
                "p-2 grid grid-cols-1 md:grid-cols-4 gap-2 text-left",
                className
            )}
        >
            <LabelValue label="NID" value={patient?.nid} />
            <LabelValue
                label="Hospital ID"
                value={patient?.hospitalId}
                className="md:col-span-2"
            />
            <LabelValue label="Phone" value={patient?.phone} />
            <LabelValue
                className="md:col-span-2"
                label="Name"
                value={patient?.name}
            />
            <LabelValue
                label="Age"
                value={!!patient?.dateOfBirth ? age(patient?.dateOfBirth) : ""}
            />
            <LabelValue label="Sex" value={patient?.sex} />
            {showAddress && (
                <LabelValue
                    className="md:col-span-4"
                    label="Address"
                    value={patient?.address}
                />
            )}
        </div>
    );
}

export default PatientInfo;
