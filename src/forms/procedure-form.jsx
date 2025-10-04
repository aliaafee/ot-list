import { useState } from "react";

import FormField from "@/components/form-field";

export const initialProcedureValue = {
    nid: "",
    hospitalId: "",
    name: "",
    age: "",
    sex: "",
    phone: "",
    diagnosis: "",
    comorbids: "",
    procedure: "",
    addedDate: "",
    addedById: "",
    remarks: "",
    duration: "",
    bed: "",
    anesthesia: "",
    requirements: "",
};

export function ProcedureForm({ onChange, value, surgeons = [] }) {
    const requiredFields = [
        "nid",
        "hospital_id",
        "phone",
        "name",
        "diagnosis",
        "procedure",
        "addedDate",
        "addedById",
    ];
    const [errorFields, setErrorFields] = useState([]);

    const handleChange = (e) => {
        const { name, value: newValue } = e.target;

        if (requiredFields.includes(name)) {
            if (newValue === "") {
                if (errorFields.indexOf(name) === -1) {
                    setErrorFields([...errorFields, name]);
                }
            } else {
                setErrorFields(
                    errorFields.filter((fieldName) => fieldName !== name)
                );
            }
        }

        onChange({
            ...value,
            [name]: newValue,
        });
    };

    return (
        <form className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <FormField
                label="NID"
                name="nid"
                value={value.nid}
                onChange={handleChange}
                className="md:col-span-1"
                error={errorFields.includes("nid")}
            />
            <FormField
                label="Hospital ID"
                name="hospitalId"
                value={value.hospitalId}
                onChange={handleChange}
                className="md:col-span-2"
                error={errorFields.includes("hospital_id")}
            />
            <FormField
                label="Phone"
                name="phone"
                value={value.phone}
                onChange={handleChange}
                className="md:col-span-1"
                error={errorFields.includes("phone")}
            />
            <FormField
                label="Name"
                name="name"
                value={value.name}
                onChange={handleChange}
                className="md:col-span-2"
                error={errorFields.includes("name")}
            />
            <FormField
                label="Age (years)"
                name="age"
                value={value.age}
                onChange={handleChange}
                type="number"
                className="md:col-span-1"
            />
            <FormField
                label="Sex"
                name="sex"
                value={value.sex}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
            >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
            </FormField>
            <FormField
                label="Diagnosis"
                name="diagnosis"
                value={value.diagnosis}
                onChange={handleChange}
                className="md:col-span-2"
                error={errorFields.includes("diagnosis")}
            />
            <FormField
                label="Procedure"
                name="procedure"
                value={value.procedure}
                onChange={handleChange}
                className="md:col-span-2"
                error={errorFields.includes("procedure")}
            />
            <FormField
                label="Comorbidities"
                name="comorbids"
                value={value.comorbids}
                onChange={handleChange}
                className="md:col-span-4"
                error={errorFields.includes("comorbids")}
            />
            <FormField
                label="Anesthesia"
                name="anesthesia"
                value={value.anesthesia}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
            >
                <option value="">Select</option>
                {["GA", "LA", "RA"].map((type) => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                ))}
            </FormField>
            <FormField
                label="Expected Duration (minutes)"
                name="duration"
                value={value.duration}
                onChange={handleChange}
                type="number"
                className="md:col-span-1"
            />
            <FormField
                label="Added By"
                name="addedById"
                value={value.addedById}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
                error={errorFields.includes("added_by")}
            >
                <option value="">Select</option>
                {surgeons.map((surgeon) => (
                    <option key={surgeon.id} value={surgeon.id}>
                        {surgeon.name}
                    </option>
                ))}
            </FormField>
            <FormField
                label="Added Date"
                name="addedDate"
                value={value.addedDate}
                onChange={handleChange}
                type="date"
                className="md:col-span-1"
                error={errorFields.includes("added_date")}
            />
            <FormField
                label="Admitted Bed"
                name="bed"
                value={value.bed}
                onChange={handleChange}
                className="md:col-span-1"
            />
            <FormField
                label="Remarks"
                name="remarks"
                value={value.remarks}
                onChange={handleChange}
                type="textarea"
                className="md:col-span-full"
            />
            <FormField
                label="Special Requirements"
                name="requirements"
                value={value.requirements}
                onChange={handleChange}
                type="textarea"
                className="md:col-span-full"
            />
        </form>
    );
}
