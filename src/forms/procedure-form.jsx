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
    addedBy: "",
    remarks: "",
    duration: "",
    bed: "",
    anesthesia: "",
    requirements: "",
};

export function ProcedureForm({
    onChange,
    value,
    surgeons = [],
    errorFields = [],
}) {
    console.log("ProcedureForm errorFields:", errorFields);

    const requiredFields = [
        "nid",
        "hospitalId",
        "phone",
        "name",
        "diagnosis",
        "procedure",
        "addedDate",
        "addedBy",
    ];
    // const [errorFields, setErrorFields] = useState([]);

    const handleChange = (e) => {
        const { name, value: newValue } = e.target;

        // if (requiredFields.includes(name)) {
        //     if (newValue === "") {
        //         if (errorFields.indexOf(name) === -1) {
        //             setErrorFields([...errorFields, name]);
        //         }
        //     } else {
        //         setErrorFields(
        //             errorFields.filter((fieldName) => fieldName !== name)
        //         );
        //     }
        // }

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
                error={"nid" in errorFields}
            />
            <FormField
                label="Hospital ID"
                name="hospitalId"
                value={value.hospitalId}
                onChange={handleChange}
                className="md:col-span-2"
                error={"nid" in errorFields}
            />
            <FormField
                label="Phone"
                name="phone"
                value={value.phone}
                onChange={handleChange}
                className="md:col-span-1"
                error={"nid" in errorFields}
            />
            <FormField
                label="Name"
                name="name"
                value={value.name}
                onChange={handleChange}
                className="md:col-span-2"
                error={"nid" in errorFields}
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
                error={"sex" in errorFields}
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
                error={"diagnosis" in errorFields}
            />
            <FormField
                label="Procedure"
                name="procedure"
                value={value.procedure}
                onChange={handleChange}
                className="md:col-span-2"
                error={"procedure" in errorFields}
            />
            <FormField
                label="Comorbidities"
                name="comorbids"
                value={value.comorbids}
                onChange={handleChange}
                className="md:col-span-4"
                error={"comorbids" in errorFields}
            />
            <FormField
                label="Anesthesia"
                name="anesthesia"
                value={value.anesthesia}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
                error={"anesthesia" in errorFields}
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
                error={"duration" in errorFields}
            />
            <FormField
                label="Added By"
                name="addedBy"
                value={value.addedBy}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
                error={"addedBy" in errorFields}
                errorMessage={errorFields["addedBy"]?.message}
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
                error={"addedDate" in errorFields}
            />
            <FormField
                label="Admitted Bed"
                name="bed"
                value={value.bed}
                onChange={handleChange}
                className="md:col-span-1"
                error={"bed" in errorFields}
            />
            <FormField
                label="Remarks"
                name="remarks"
                value={value.remarks}
                onChange={handleChange}
                type="textarea"
                className="md:col-span-full"
                error={"remarks" in errorFields}
            />
            <FormField
                label="Special Requirements"
                name="requirements"
                value={value.requirements}
                onChange={handleChange}
                type="textarea"
                className="md:col-span-full"
                error={"requirements" in errorFields}
            />
        </form>
    );
}
