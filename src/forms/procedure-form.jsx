import { useEffect, useMemo, useState } from "react";

import FormField from "@/components/form-field";

export const initialProcedureValue = {
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

export const validateProcedure = (procedure) => {
    const errorFields = {};
    const requiredFields = [
        "diagnosis",
        "procedure",
        "addedDate",
        "addedBy",
    ];
    requiredFields.forEach((field) => {
        if (!procedure[field] || procedure[field].toString().trim() === "") {
            errorFields[field] = {
                name: field,
                message: "This field is required.",
            };
        }
    });
    return errorFields;
};

export function ProcedureForm({
    onChange,
    value,
    surgeons = [],
    errorFields = {},
}) {
    const handleChange = (e) => {
        const { name, value: newValue } = e.target;

        const newProcedureValue = {
            ...value,
            [name]: newValue,
        };

        onChange({
            ...value,
            ...newProcedureValue,
        });
    };

    return (
        <form className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <FormField
                label="Diagnosis"
                name="diagnosis"
                value={value.diagnosis}
                onChange={handleChange}
                className="md:col-span-2"
                error={"diagnosis" in errorFields}
                errorMessage={errorFields["diagnosis"]?.message}
            />
            <FormField
                label="Procedure"
                name="procedure"
                value={value.procedure}
                onChange={handleChange}
                className="md:col-span-2"
                error={"procedure" in errorFields}
                errorMessage={errorFields["procedure"]?.message}
            />
            <FormField
                label="Comorbidities"
                name="comorbids"
                value={value.comorbids}
                onChange={handleChange}
                className="md:col-span-4"
                error={"comorbids" in errorFields}
                errorMessage={errorFields["comorbids"]?.message}
            />
            <FormField
                label="Anesthesia"
                name="anesthesia"
                value={value.anesthesia}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
                error={"anesthesia" in errorFields}
                errorMessage={errorFields["anesthesia"]?.message}
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
                errorMessage={errorFields["duration"]?.message}
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
                errorMessage={errorFields["addedDate"]?.message}
            />
            <FormField
                label="Admitted Bed"
                name="bed"
                value={value.bed}
                onChange={handleChange}
                className="md:col-span-1"
                error={"bed" in errorFields}
                errorMessage={errorFields["bed"]?.message}
            />
            <FormField
                label="Remarks"
                name="remarks"
                value={value.remarks}
                onChange={handleChange}
                type="textarea"
                className="md:col-span-full"
                error={"remarks" in errorFields}
                errorMessage={errorFields["remarks"]?.message}
            />
            <FormField
                label="Special Requirements"
                name="requirements"
                value={value.requirements}
                onChange={handleChange}
                type="textarea"
                className="md:col-span-full"
                error={"requirements" in errorFields}
                errorMessage={errorFields["requirements"]?.message}
            />
        </form>
    );
}
