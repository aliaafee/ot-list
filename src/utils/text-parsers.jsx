import { initialPatientValue } from "@/forms/patient-form";

export function patientInfoFromHINAIHeader(text) {
    const patientData = { ...initialPatientValue };
    const lines = text.split("\n");

    // Accepts text like:
    // Mr FIRSTNAME LAST NAME ( MALE | 10 Years 5 Months (01-Jan-1990) )  visitStatus:IP Bed Type/Location/BED NO :NORMAL/SURGICAL WARD/ SW-33	IGMH0000012345
    // NATIONAL ID : A000000 Mobile No : 7123456 Address : ISLAND, Atoll, Atoll, COUNTRY , Blood group : ``O`` POSITIVE , G6PD : 1410

    // Validate format - check for required patterns
    if (lines.length < 2) {
        throw new Error(
            "Invalid format: Expected at least 2 lines of patient information"
        );
    }

    const firstLine = lines[0];
    const secondLine = lines[1];

    // Check if first line has basic structure (name in parentheses and hospital ID)
    if (!firstLine.match(/\([^)]+\)/)) {
        throw new Error(
            "Invalid format: First line must contain patient information in parentheses"
        );
    }

    // Check if second line has NATIONAL ID
    if (!secondLine.match(/NATIONAL\s+ID\s*:/i)) {
        throw new Error("Invalid format: Second line must contain NATIONAL ID");
    }

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

export function patientInfoFromVinavi(text) {
    const patientData = { ...initialPatientValue };
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

    // Accepts text like:
    // Firstname Lastname Othername
    // 40 years 1 month
    // A0123456
    // xxxxxxx
    // Male
    //
    // 17 Jan 1980
    //
    // Some House , K. Someisland
    //
    // 7123456

    if (lines.length < 6) {
        throw new Error(
            "Invalid format: Expected at least 6 lines of patient information"
        );
    }

    // Line 0: Name
    if (lines[0]) {
        patientData.name = lines[0];
    }

    // Line 2: National ID (e.g., A046974)
    if (lines[2] && /^[A-Z]?\d+$/.test(lines[2])) {
        patientData.nid = lines[2];
    }

    // Line 4: Sex (Male/Female)
    if (lines[4] && /^(male|female)$/i.test(lines[4])) {
        patientData.sex = lines[4].toLowerCase();
    }

    // Line 5: Date of Birth (e.g., "17 Oct 1985")
    if (lines[5]) {
        const date = new Date(lines[5]);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            patientData.dateOfBirth = `${year}-${month}-${day}`;
        }
    }

    // Line 6: Address (e.g., "Morning Sun , S. Hulhudhoo")
    if (lines[6]) {
        patientData.address = lines[6];
    }

    // Line 7: Phone number
    if (lines[7] && /^\d+$/.test(lines[7])) {
        patientData.phone = lines[7];
    }

    return patientData;
}

export function patientInfoFromText(text) {
    // Differentiate between HINAI and Vinavi formats
    // HINAI format characteristics:
    // - Has "NATIONAL ID" keyword in second line
    // - Has parentheses with patient info in first line
    // - Typically 2 lines

    // Vinavi format characteristics:
    // - Multiple short lines (name, age, NID, hospital ID, sex, DOB, address, phone)
    // - No "NATIONAL ID" keyword
    // - No parentheses with structured info
    // - Typically 7-8+ lines

    const lines = text.split("\n");

    // Check for HINAI format indicators
    const hasNationalIdKeyword = text.match(/NATIONAL\s+ID\s*:/i);
    const hasParentheses = lines[0]?.match(/\([^)]+\)/);

    if (hasNationalIdKeyword && hasParentheses) {
        // HINAI format
        return patientInfoFromHINAIHeader(text);
    } else {
        // Vinavi format
        return patientInfoFromVinavi(text);
    }
}
