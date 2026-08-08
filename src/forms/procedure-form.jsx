import FormField from "@/components/form-field";
import ProcedureCodeSelector from "@/components/procedure-code-selector";
import { isCoded, renderProcedureText } from "@/lib/nspc";

export const initialProcedureValue = {
    diagnosis: "",
    comorbids: "",
    // What the operation is called, as one line of text. Form state only
    // - it is what the required-field check looks at and what the field
    // renders - and is not saved to `procedures.procedure`, which now
    // holds nothing but the names of pre-coding-system records.
    procedure: "",
    addedDate: "",
    addedBy: "",
    remarks: "",
    duration: "",
    bed: "",
    anesthesia: "",
    requirements: "",
    // The catalogue entry behind `procedure`, when the text came from a
    // catalogue pick rather than being typed. Lives on the form value
    // rather than in local state so whoever saves the procedure can
    // persist it too; it is stored in `procedureCodes`, never in
    // `procedures`.
    procedureCode: null,
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

    // One field, two outputs. The selector hands back either a catalogue
    // value or the raw text typed into it. `procedure` mirrors whichever
    // it is as display text, so the required-field check has something to
    // look at; `procedureCode` is set only when there is a catalogue
    // entry, and dropped the moment the text stops coming from one. What
    // gets stored is derived from `procedureCode ?? procedure` at save.
    const setProcedure = (next) =>
        onChange({
            ...value,
            procedure: renderProcedureText(next),
            procedureCode: isCoded(next) ? next : null,
        });

    return (
        <form className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <FormField
                label="Diagnosis"
                name="diagnosis"
                value={value.diagnosis}
                onChange={handleChange}
                className="md:col-span-4"
                error={"diagnosis" in errorFields}
                errorMessage={errorFields["diagnosis"]?.message}
            />
            <ProcedureCodeSelector
                label="Procedure (NSPC coded, or type freely)"
                value={value.procedureCode ?? value.procedure}
                onChange={setProcedure}
                error={"procedure" in errorFields}
                errorMessage={errorFields["procedure"]?.message}
                showPostCoordination={true}
                postCoordinationFields={[
                    "priority",
                    "laterality",
                    "spinalLevels",
                ]}
                className="md:col-span-4"
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
