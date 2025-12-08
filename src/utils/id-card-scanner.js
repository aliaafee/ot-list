import Tesseract from "tesseract.js";

/**
 * Extract information from a Maldives National ID card image
 * @param {File|Blob|string} imageSource - Image file, blob, or data URL
 * @param {Function} statusCallback - Optional callback for progress updates (progress, message)
 * @returns {Promise<Object>} Extracted patient information
 */
export async function extractInfoFromNationalIdCard(
    imageSource,
    statusCallback
) {
    try {
        // Perform OCR on the image
        if (statusCallback) {
            statusCallback(0, "Initializing OCR...");
        }

        const result = await Tesseract.recognize(
            imageSource,
            "eng", // Maldivian ID cards use English
            {
                logger: (info) => {
                    // Optional: Log progress
                    if (info.status === "recognizing text") {
                        const progress = Math.round(info.progress * 100);
                        console.log(`OCR Progress: ${progress}%`);
                        if (statusCallback) {
                            statusCallback(
                                info.progress,
                                `Recognizing text... ${progress}%`
                            );
                        }
                    } else if (statusCallback) {
                        statusCallback(info.progress || 0, info.status);
                    }
                },
            }
        );

        if (statusCallback) {
            statusCallback(1, "Parsing extracted text...");
        }

        const text = result.data.text;
        console.log("OCR Text:", text);

        // Parse the extracted text
        return parseNationalIdText(text);
    } catch (error) {
        console.error("Error extracting ID card information:", error);
        throw new Error("Failed to extract information from ID card image");
    }
}

/**
 * Parse text extracted from Maldives National ID card
 * Typical format:
 * - ID Number: A123456 (letter + 6 digits)
 * - Name: Full name in English
 * - Date of Birth: DD MMM YYYY or DD/MM/YYYY
 * - Sex: Male/Female or M/F
 * @param {string} text - OCR extracted text
 * @returns {Object} Parsed patient information
 */
function parseNationalIdText(text) {
    const patientData = {
        nid: "",
        name: "",
        dateOfBirth: "",
        sex: "",
    };

    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

    // Extract National ID Number (format: A123456)
    const nidPattern = /\b([A-Z]\d{6})\b/;
    const nidMatch = text.match(nidPattern);
    if (nidMatch) {
        patientData.nid = nidMatch[1];
    }

    // Extract Date of Birth (various formats)
    // Formats: DD MMM YYYY, DD/MM/YYYY, DD-MM-YYYY
    const dobPatterns = [
        /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i,
        /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,
    ];

    for (const pattern of dobPatterns) {
        const dobMatch = text.match(pattern);
        if (dobMatch) {
            const dateStr = dobMatch[1];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                patientData.dateOfBirth = `${year}-${month}-${day}`;
                break;
            }
        }
    }

    // Extract Sex
    const sexPattern = /\b(Male|Female|M|F)\b/i;
    const sexMatch = text.match(sexPattern);
    if (sexMatch) {
        const sexValue = sexMatch[1].toLowerCase();
        if (sexValue === "m" || sexValue === "male") {
            patientData.sex = "male";
        } else if (sexValue === "f" || sexValue === "female") {
            patientData.sex = "female";
        }
    }

    // Extract Name (more complex - typically appears near "Name" keyword)
    const namePattern = /(?:Name|NAME)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
    const nameMatch = text.match(namePattern);
    if (nameMatch) {
        patientData.name = nameMatch[1].trim();
    } else {
        // Fallback: Try to find capitalized words that might be a name
        // Look for lines with multiple capitalized words
        for (const line of lines) {
            const capitalizedWords = line.match(
                /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/
            );
            if (
                capitalizedWords &&
                !line.match(/\b(Male|Female|Maldives|Republic|Identity)\b/i)
            ) {
                patientData.name = capitalizedWords[0];
                break;
            }
        }
    }

    return patientData;
}

/**
 * Capture image from device camera
 * @returns {Promise<Blob>} Image blob
 */
export async function captureIdCardImage() {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment"; // Use rear camera on mobile

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                resolve(file);
            } else {
                reject(new Error("No image selected"));
            }
        };

        input.click();
    });
}

/**
 * Process ID card and extract information
 * Combines capture and extraction
 * @returns {Promise<Object>} Extracted patient information
 */
export async function scanNationalIdCard() {
    try {
        const imageFile = await captureIdCardImage();
        const patientInfo = await extractInfoFromNationalIdCard(imageFile);
        return patientInfo;
    } catch (error) {
        console.error("Error scanning ID card:", error);
        throw error;
    }
}
