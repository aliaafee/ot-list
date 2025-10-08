import dayjs from "dayjs";

export function GenerateProdecureFormData(surgeons) {
    return {
        nid: `A${Math.floor(100000 + Math.random() * 900000)}`, // Random 6-digit number with 'A' prepended
        hospitalId: `IGMH${Math.floor(100000 + Math.random() * 900000)
            .toString()
            .padStart(10, "0")}`,
        phone: Math.floor(1000000 + Math.random() * 9000000).toString(),
        name: `${
            [
                "John",
                "Jane",
                "Michael",
                "Emily",
                "Chris",
                "Sarah",
                "David",
                "Laura",
                "James",
                "Anna",
            ][Math.floor(Math.random() * 10)]
        } ${
            [
                "Smith",
                "Johnson",
                "Brown",
                "Williams",
                "Jones",
                "Garcia",
                "Miller",
                "Davis",
                "Martinez",
                "Hernandez",
            ][Math.floor(Math.random() * 10)]
        }`, // Random patient name
        age: Math.floor(18 + Math.random() * 60).toString(), // Random age between 18 and 77
        sex: Math.random() > 0.5 ? "Male" : "Female", // Random sex
        diagnosis: `${
            [
                "Acute Appendicitis",
                "Chronic Cholecystitis",
                "Inguinal Hernia",
                "Femoral Fracture",
                "Symptomatic Gallstones",
                "Senile Cataract",
                "Recurrent Tonsillitis",
                "Spontaneous Pneumothorax",
                "Obstructive Kidney Stones",
                "Carpal Tunnel Syndrome",
            ][Math.floor(Math.random() * 10)]
        }`, // Random realistic surgical diagnosis
        procedure: `${
            [
                "Laparoscopic Appendectomy",
                "Open Cholecystectomy",
                "Hernia Repair",
                "Internal Fixation of Fracture",
                "Gallbladder Removal",
                "Cataract Extraction",
                "Tonsillectomy",
                "Chest Tube Insertion",
                "Ureteroscopy and Stone Removal",
                "Carpal Tunnel Release",
            ][Math.floor(Math.random() * 10)]
        }`, // Random realistic procedure name
        comorbids: ["", "Hypertension", "DM, DLP", "DM"][
            Math.floor(Math.random() * 3)
        ],
        addedDate: dayjs().format("YYYY-MM-DD"), // Current date
        addedBy:
            surgeons[Math.floor(Math.random() * surgeons.length)]?.id || "", // Random surgeon name
        remarks: `Remarks ${Math.floor(1 + Math.random() * 10)}`, // Random remarks
        duration: Math.floor(30 + Math.random() * 120).toString(), // Random duration between 30 and 150 minutes
        anesthesia: ["GA", "LA"][Math.floor(Math.random() * 2)],
        bed: `Bed-${Math.floor(1 + Math.random() * 50)}`, // Random bed number
        requirements: `Requirement ${Math.floor(1 + Math.random() * 10)}`, // Random requirements
    };
}
