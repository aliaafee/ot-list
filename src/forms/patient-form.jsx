import FormField from "@/components/form-field";

export const initialPatientValue = {
    nid: "",
    hospitalId: "",
    name: "",
    dateOfBirth: "",
    sex: "",
    phone: "",
    address: "",
};

export const validatePatient = (patient) => {
    const errorFields = {};

    // Check if at least one of nid or hospitalId is provided
    const hasNid = patient.nid && patient.nid.toString().trim() !== "";
    const hasHospitalId =
        patient.hospitalId && patient.hospitalId.toString().trim() !== "";

    if (!hasNid && !hasHospitalId) {
        errorFields["nid"] = {
            name: "nid",
            message: "Either NID or Hospital ID is required.",
        };
        errorFields["hospitalId"] = {
            name: "hospitalId",
            message: "Either NID or Hospital ID is required.",
        };
    }

    // Check other required fields
    const otherRequiredFields = ["phone", "name"];
    otherRequiredFields.forEach((field) => {
        if (!patient[field] || patient[field].toString().trim() === "") {
            errorFields[field] = {
                name: field,
                message: "This field is required.",
            };
        }
    });

    return errorFields;
};

export function PatientForm({ onChange, value, errorFields = {} }) {
    const handleChange = (e) => {
        const { name, value: newValue } = e.target;

        const newPatientValue = {
            ...value,
            [name]: newValue,
        };

        onChange({
            ...value,
            ...newPatientValue,
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
                errorMessage={errorFields["nid"]?.message}
            />
            <FormField
                label="Hospital ID"
                name="hospitalId"
                value={value.hospitalId}
                onChange={handleChange}
                className="md:col-span-2"
                error={"hospitalId" in errorFields}
                errorMessage={errorFields["hospitalId"]?.message}
            />
            <FormField
                label="Phone"
                name="phone"
                value={value.phone}
                onChange={handleChange}
                className="md:col-span-1"
                error={"phone" in errorFields}
                errorMessage={errorFields["phone"]?.message}
            />
            <FormField
                label="Name"
                name="name"
                value={value.name}
                onChange={handleChange}
                className="md:col-span-2"
                error={"name" in errorFields}
                errorMessage={errorFields["name"]?.message}
            />
            <FormField
                label="DOB"
                name="dateOfBirth"
                value={value.dateOfBirth}
                onChange={handleChange}
                type="date"
                className="md:col-span-1"
                error={"dateOfBirth" in errorFields}
                errorMessage={errorFields["dateOfBirth"]?.message}
            />
            <FormField
                label="Sex"
                name="sex"
                value={value.sex}
                onChange={handleChange}
                type="select"
                className="md:col-span-1"
                error={"sex" in errorFields}
                errorMessage={errorFields["sex"]?.message}
            >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
            </FormField>
            <FormField
                label="Address"
                name="address"
                value={value.address}
                onChange={handleChange}
                className="md:col-span-4"
                error={"address" in errorFields}
                errorMessage={errorFields["address"]?.message}
            />
        </form>
    );
}
