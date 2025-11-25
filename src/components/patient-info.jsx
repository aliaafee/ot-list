import { age } from "@/utils/dates";
import LabelValue from "./label-value";

function PatientInfo({ patient, className = "" }) {
    return (
        <div className={`p-2 grid grid-cols-1 md:grid-cols-4 gap-2 ${className}`}>
            <LabelValue
                label="NID"
                value={patient?.nid}
            />
            <LabelValue
                label="Hospital ID"
                value={patient?.hospitalId}
                className="md:col-span-2"
            />
            <LabelValue
                label="Phone"
                value={patient?.phone}
            />
            <LabelValue
                className="md:col-span-2"
                label="Name"
                value={patient?.name}
            />
            <LabelValue
                label="Age"
                value={age(patient?.dateOfBirth)}
            />
            <LabelValue
                label="Sex"
                value={patient?.sex}
            />
        </div>
    );
}

export default PatientInfo;
