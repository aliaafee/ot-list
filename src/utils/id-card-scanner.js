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

        // Detect and crop to largest quadrilateral (ID card)
        const cropped = detectAndCropIdCard(cv, src);

        let gray = new cv.Mat();

        // Convert to grayscale
        cv.cvtColor(cropped, gray, cv.COLOR_RGBA2GRAY);

        // Write processed image back to canvas
        cv.imshow(canvas, gray);

        // Clean up
        src.delete();
        cropped.delete();
        gray.delete();

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
 * Detect and crop the largest quadrilateral in the image (ID card)
 * @param {Object} cv - OpenCV instance
 * @param {Mat} src - Source image
 * @returns {Mat} Cropped and perspective-transformed image
 */
function detectAndCropIdCard(cv, src) {
    try {
        console.log("Detecting ID card...");

        // Convert to grayscale for edge detection
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Apply Gaussian blur to reduce noise
        const blurred = new cv.Mat();
        cv.GaussianBlur(
            gray,
            blurred,
            new cv.Size(5, 5),
            0,
            0,
            cv.BORDER_DEFAULT
        );

        // Apply Canny edge detection
        const edges = new cv.Mat();
        cv.Canny(blurred, edges, 50, 150);

        // Find contours
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(
            edges,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );

        console.log(`Found ${contours.size()} contours`);

        // Find the largest quadrilateral contour
        let maxArea = 0;
        let bestContour = null;
        const minArea = src.rows * src.cols * 0.1; // At least 10% of image

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);

            // Approximate contour to polygon
            const peri = cv.arcLength(contour, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.02 * peri, true);

            // Check if it's a quadrilateral with significant area
            if (approx.rows === 4 && area > maxArea && area > minArea) {
                maxArea = area;
                if (bestContour) {
                    bestContour.delete();
                }
                bestContour = approx.clone();
                console.log(
                    `Found quadrilateral with area: ${area} (${(
                        (area / (src.rows * src.cols)) *
                        100
                    ).toFixed(1)}%)`
                );
            }

            approx.delete();
        }

        // Clean up
        gray.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();

        // If we found a good quadrilateral, perform perspective transform
        if (bestContour) {
            console.log("Applying perspective transform...");
            const transformed = applyPerspectiveTransform(cv, src, bestContour);
            bestContour.delete();
            return transformed;
        }

        console.log("No quadrilateral found, using original image");
        return src.clone();
    } catch (error) {
        console.error("Error in detectAndCropIdCard:", error);
        return src.clone();
    }
}

/**
 * Apply perspective transformation to straighten the ID card
 * @param {Object} cv - OpenCV instance
 * @param {Mat} src - Source image
 * @param {Mat} contour - Quadrilateral contour (4 points)
 * @returns {Mat} Transformed image
 */
function applyPerspectiveTransform(cv, src, contour) {
    try {
        // Extract the 4 corner points
        const points = [];
        for (let i = 0; i < 4; i++) {
            points.push({
                x: contour.data32S[i * 2],
                y: contour.data32S[i * 2 + 1],
            });
        }

        // Order points: top-left, top-right, bottom-right, bottom-left
        points.sort((a, b) => a.y - b.y);
        const topPoints = points.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottomPoints = points.slice(2, 4).sort((a, b) => a.x - b.x);
        const ordered = [
            topPoints[0], // top-left
            topPoints[1], // top-right
            bottomPoints[1], // bottom-right
            bottomPoints[0], // bottom-left
        ];

        // Calculate dimensions of the output rectangle
        const widthTop = Math.sqrt(
            Math.pow(ordered[1].x - ordered[0].x, 2) +
                Math.pow(ordered[1].y - ordered[0].y, 2)
        );
        const widthBottom = Math.sqrt(
            Math.pow(ordered[2].x - ordered[3].x, 2) +
                Math.pow(ordered[2].y - ordered[3].y, 2)
        );
        const maxWidth = Math.max(widthTop, widthBottom);

        const heightLeft = Math.sqrt(
            Math.pow(ordered[3].x - ordered[0].x, 2) +
                Math.pow(ordered[3].y - ordered[0].y, 2)
        );
        const heightRight = Math.sqrt(
            Math.pow(ordered[2].x - ordered[1].x, 2) +
                Math.pow(ordered[2].y - ordered[1].y, 2)
        );
        const maxHeight = Math.max(heightLeft, heightRight);

        console.log(
            `Transform to dimensions: ${maxWidth.toFixed(
                0
            )}x${maxHeight.toFixed(0)}`
        );

        // Create source and destination point matrices
        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            ordered[0].x,
            ordered[0].y,
            ordered[1].x,
            ordered[1].y,
            ordered[2].x,
            ordered[2].y,
            ordered[3].x,
            ordered[3].y,
        ]);

        const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,
            0,
            maxWidth,
            0,
            maxWidth,
            maxHeight,
            0,
            maxHeight,
        ]);

        // Get perspective transformation matrix
        const M = cv.getPerspectiveTransform(srcPoints, dstPoints);

        // Apply perspective transformation
        const dst = new cv.Mat();
        const dsize = new cv.Size(maxWidth, maxHeight);
        cv.warpPerspective(
            src,
            dst,
            M,
            dsize,
            cv.INTER_LINEAR,
            cv.BORDER_CONSTANT,
            new cv.Scalar()
        );

        // Clean up
        srcPoints.delete();
        dstPoints.delete();
        M.delete();

        return dst;
    } catch (error) {
        console.error("Error in applyPerspectiveTransform:", error);
        return src.clone();
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

        const worker = await Tesseract.createWorker("eng", 1, {
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

        const result = await worker.recognize(preprocessedImage, {
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        });

        await worker.terminate();

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
