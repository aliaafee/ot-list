import { initialPatientValue } from "@/forms/patient-form";

export function patientInfoFromHINAIHeader(text) {
    const patientData = { ...initialPatientValue };
    const lines = text.split("\n");

    // Accepts text like:
    // Mr FIRSTNAME LAST NAME ( MALE | 10 Years 5 Months (01-Jan-1990) )  visitStatus:IP Bed Type/Location/BED NO :NORMAL/SURGICAL WARD/ SW-33	IGMH0000012345
    // NATIONAL ID : A000000 Mobile No : 7123456 Address : ISLAND, Atoll, Atoll, COUNTRY , Blood group : ``O`` POSITIVE , G6PD : 1410
    if (lines.length > 0) {
        // First line contains: Name, Sex, DOB, Hospital ID, Bed
        const firstLine = lines[0];

        // Extract name - everything before the first opening parenthesis
        const nameMatch = firstLine.match(/^(Mr|Mrs|Ms|Miss)?\s*([^(]+)/i);
        if (nameMatch) {
            // Remove title (Mr, Mrs, Ms, Miss) from the name
            const fullMatch = nameMatch[0].trim();
            const nameWithoutTitle = fullMatch.replace(
                /^(Mr|Mrs|Ms|Miss)\s+/i,
                ""
            );
            patientData.name = nameWithoutTitle.trim();
        }

        // Extract sex - looking for MALE or FEMALE in parentheses
        const sexMatch = firstLine.match(/\(\s*(MALE|FEMALE)\s*\|/i);
        if (sexMatch) {
            patientData.sex = sexMatch[1].toLowerCase();
        }

        // Extract DOB - looking for date pattern like (08-Jun-1972)
        const dobMatch = firstLine.match(/\((\d{2}-\w{3}-\d{4})\)/);
        if (dobMatch) {
            // Convert date format from "08-Jun-1972" to "1972-06-08"
            const dateStr = dobMatch[1];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                patientData.dateOfBirth = `${year}-${month}-${day}`;
            }
        }

        // Extract Hospital ID - looking for pattern like IGMH0000048625 at the end
        const hospitalIdMatch = firstLine.match(/\s+([A-Z]+\d+)\s*$/);
        if (hospitalIdMatch) {
            patientData.hospitalId = hospitalIdMatch[1];
        }
    }

    if (lines.length > 1) {
        // Second line contains: National ID, Mobile No, Address
        const secondLine = lines[1];

        // Extract National ID - looking for "NATIONAL ID : A000518"
        const nidMatch = secondLine.match(/NATIONAL\s+ID\s*:\s*([A-Z]?\d+)/i);
        if (nidMatch) {
            patientData.nid = nidMatch[1];
        }

        // Extract Mobile No - looking for "Mobile No : 7211297"
        const phoneMatch = secondLine.match(/Mobile\s+No\s*:\s*(\d+)/i);
        if (phoneMatch) {
            patientData.phone = phoneMatch[1];
        }

        // Extract Address - looking for "Address : ISLAND, Atoll, Atoll, COUNTRY"
        // Address appears between "Address :" and the next field (usually "Blood group")
        const addressMatch = secondLine.match(
            /Address\s*:\s*([^,]+(?:,\s*[^,]+)*?)(?:\s*,\s*Blood\s+group|$)/i
        );
        if (addressMatch) {
            patientData.address = addressMatch[1].trim();
        }
    }

    return patientData;
}

export function bedInfoFromHINAIHeader(text) {
    const lines = text.split("\n");

    if (lines.length > 0) {
        // First line contains: Name, Sex, DOB, Hospital ID, Bed
        const firstLine = lines[0];
        console.log("First line for bed extraction:", firstLine);

        // Extract Bed - looking for patterns like:
        // "BED NO :NORMAL/SURGICAL WARD/ SW-33" -> SW-33
        // "BED NO :ICU & CCU/ICCU/ ICU12" -> ICCU12
        // "BED NO :NORMAL/DHARUMAVANTHA 17/ 17-08" -> 17-08
        const bedMatch = firstLine.match(
            /BED\s+NO\s*:[^\/]*\/[^\/]*\/\s*([^\s\t]+)/i
        );
        if (bedMatch) {
            // Extract the bed number which is after the second slash
            let bedNumber = bedMatch[1].trim();

            // For patterns like "ICU12", check if location contains room identifier
            const locationMatch = firstLine.match(
                /BED\s+NO\s*:[^\/]*\/([^\/]+)\/\s*([^\s\t]+)/i
            );
            if (locationMatch) {
                const location = locationMatch[1].trim();
                const bedPart = locationMatch[2].trim();

                // If location has a room code (like "ICCU") and bed is just a number,
                // combine them (e.g., "ICCU" + "12" = "ICCU12")
                if (/^[A-Z]+$/.test(location) && /^\d+$/.test(bedPart)) {
                    bedNumber = location + bedPart;
                } else if (/^[A-Z]+\s*&\s*[A-Z]+\/[A-Z]+$/.test(location)) {
                    // For "ICU & CCU/ICCU", extract the last part
                    const roomMatch = location.match(/\/([A-Z]+)$/);
                    if (roomMatch && /^\d+$/.test(bedPart)) {
                        bedNumber = roomMatch[1] + bedPart;
                    }
                }
            }

            // Set bed in newProcedure instead of patientData
            return bedNumber;
        }
    }
    return "";
}
