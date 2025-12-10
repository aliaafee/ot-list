import Tesseract from "tesseract.js";
const { getOpenCv } = await import("@/lib/opencv.js");

/**
 * Preprocess National ID card image to improve OCR accuracy
 * @param {File|Blob|string} imageSource - Image file, blob, or data URL
 * @param {Function} statusCallback - Optional callback for progress updates
 * @returns {Promise<string>} Preprocessed image as data URL
 */
async function preprocessNationalIdCard(imageSource, statusCallback) {
    if (statusCallback) {
        statusCallback(0, "Preprocessing image...");
    }

    try {
        const { cv } = await getOpenCv();

        // Convert image source to data URL if needed
        let imageDataUrl;
        if (imageSource instanceof File || imageSource instanceof Blob) {
            imageDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(imageSource);
            });
        } else {
            imageDataUrl = imageSource;
        }

        // Load image into an HTML Image element
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = imageDataUrl;
        });

        // Create canvas and draw image
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Read image into OpenCV matrix
        const src = cv.imread(canvas);
        let gray = new cv.Mat();
        const dst = new cv.Mat();

        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Apply Gaussian blur to denoise
        // ksize = (10, 10), sigmaX = 0 (calculated from kernel size)
        const ksize = new cv.Size(1, 1);
        cv.GaussianBlur(gray, dst, ksize, 0, 0, cv.BORDER_DEFAULT);

        // Write processed image back to canvas
        cv.imshow(canvas, dst);

        // Clean up
        src.delete();
        gray.delete();
        dst.delete();

        // Convert canvas to data URL
        return canvas.toDataURL("image/png");
    } catch (error) {
        console.error("Error preprocessing image:", error);
        // Fallback: return original image if preprocessing fails
        if (imageSource instanceof File || imageSource instanceof Blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(imageSource);
            });
        }
        return imageSource;
    }
}

/**
 * Extract information from a Maldives National ID card image
 * @param {File|Blob|string} imageSource - Image file, blob, or data URL
 * @param {Function} statusCallback - Optional callback for progress updates (progress, message, preprocessedImageUrl)
 * @returns {Promise<Object>} Extracted patient information
 */
export async function extractInfoFromNationalIdCard(
    imageSource,
    statusCallback
) {
    try {
        // Preprocess the image
        const preprocessedImage = await preprocessNationalIdCard(
            imageSource,
            statusCallback
        );

        // Send preprocessed image to callback
        if (statusCallback) {
            statusCallback(0, "Image preprocessed", preprocessedImage);
        }

        // Perform OCR on the image
        if (statusCallback) {
            statusCallback(0, "Initializing OCR...");
        }

        const worker = Tesseract.createWorker({
            logger: (info) => {
                // Optional: Log progress
                if (info.status === "initializing tesseract") {
                    const progress = Math.round(info.progress * 100);
                    console.log(`Tesseract Init Progress: ${progress}%`);
                    if (statusCallback) {
                        statusCallback(
                            info.progress,
                            `Initializing OCR... ${progress}%`
                        );
                    }
                } else if (statusCallback) {
                    statusCallback(info.progress || 0, info.status);
                }
            },
        });

        const result = await Tesseract.recognize(
            preprocessedImage,
            "eng", // Maldivian ID cards use English
            {
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_WORD,
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
        console.log(result);

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
