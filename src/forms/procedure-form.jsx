import { useEffect, useMemo, useState } from "react";

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
    errorFields = {},
}) {
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
    const [currentErrorFields, setCurrentErrorFields] = useState({});
    const [inputErrorFields, setInputErrorFields] = useState({});

    useEffect(() => {
        setCurrentErrorFields((prev) => ({
            ...inputErrorFields,
            ...errorFields,
        }));
    }, [errorFields, inputErrorFields]);

    const handleChange = (e) => {
        const { name, value: newValue } = e.target;

        var newInputErrors = {};
        if (requiredFields.includes(name)) {
            if (newValue === "") {
                newInputErrors = {
                    ...inputErrorFields,
                    [name]: { name, message: "This field is required." },
                };
            } else {
                const updated = { ...inputErrorFields };
                delete updated[name];
                newInputErrors = updated;
            }
        }

        setInputErrorFields(newInputErrors);

        onChange({
            ...value,
            [name]: newValue,
            inputErrorFields: newInputErrors,
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
                error={"nid" in currentErrorFields}
                errorMessage={currentErrorFields["nid"]?.message}
            />
            <FormField
                label="Hospital ID"
                name="hospitalId"
                value={value.hospitalId}
                onChange={handleChange}
                className="md:col-span-2"
                error={"hospitalId" in currentErrorFields}
                errorMessage={currentErrorFields["hospitalId"]?.message}
            />
            <FormField
                label="Phone"
                name="phone"
                value={value.phone}
                onChange={handleChange}
                className="md:col-span-1"
                error={"phone" in currentErrorFields}
                errorMessage={currentErrorFields["phone"]?.message}
            />
            <FormField
                label="Name"
                name="name"
                value={value.name}
                onChange={handleChange}
                className="md:col-span-2"
                error={"name" in currentErrorFields}
                errorMessage={currentErrorFields["name"]?.message}
            />
            <FormField
                label="Age (years)"
                name="age"
                value={value.age}
                onChange={handleChange}
                type="number"
                className="md:col-span-1"
                errorMessage={currentErrorFields["age"]?.message}
            />
            <FormField
                label="Sex"
                name="sex"
                value={value.sex}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
                error={"sex" in currentErrorFields}
                errorMessage={currentErrorFields["sex"]?.message}
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
                error={"diagnosis" in currentErrorFields}
                errorMessage={currentErrorFields["diagnosis"]?.message}
            />
            <FormField
                label="Procedure"
                name="procedure"
                value={value.procedure}
                onChange={handleChange}
                className="md:col-span-2"
                error={"procedure" in currentErrorFields}
                errorMessage={currentErrorFields["procedure"]?.message}
            />
            <FormField
                label="Comorbidities"
                name="comorbids"
                value={value.comorbids}
                onChange={handleChange}
                className="md:col-span-4"
                error={"comorbids" in currentErrorFields}
                errorMessage={currentErrorFields["comorbids"]?.message}
            />
            <FormField
                label="Anesthesia"
                name="anesthesia"
                value={value.anesthesia}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
                error={"anesthesia" in currentErrorFields}
                errorMessage={currentErrorFields["anesthesia"]?.message}
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
                error={"duration" in currentErrorFields}
                errorMessage={currentErrorFields["duration"]?.message}
            />
            <FormField
                label="Added By"
                name="addedBy"
                value={value.addedBy}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
                error={"addedBy" in currentErrorFields}
                errorMessage={currentErrorFields["addedBy"]?.message}
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
                error={"addedDate" in currentErrorFields}
                errorMessage={currentErrorFields["addedDate"]?.message}
            />
            <FormField
                label="Admitted Bed"
                name="bed"
                value={value.bed}
                onChange={handleChange}
                className="md:col-span-1"
                error={"bed" in currentErrorFields}
                errorMessage={currentErrorFields["bed"]?.message}
            />
            <FormField
                label="Remarks"
                name="remarks"
                value={value.remarks}
                onChange={handleChange}
                type="textarea"
                className="md:col-span-full"
                error={"remarks" in currentErrorFields}
                errorMessage={currentErrorFields["remarks"]?.message}
            />
            <FormField
                label="Special Requirements"
                name="requirements"
                value={value.requirements}
                onChange={handleChange}
                type="textarea"
                className="md:col-span-full"
                error={"requirements" in currentErrorFields}
                errorMessage={currentErrorFields["requirements"]?.message}
            />
        </form>
    );
}
