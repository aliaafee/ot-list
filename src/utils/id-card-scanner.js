import Tesseract from "tesseract.js";

// Image preprocessing constants
const CANNY_THRESHOLD_LOW = 50;
const CANNY_THRESHOLD_HIGH = 150;
const CANNY_APERTURE_SIZE = 3;
const MIN_CONTOUR_AREA_RATIO = 0.1; // Minimum 10% of image area

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
        // Preprocess the image before OCR
        if (statusCallback) {
            statusCallback(0, "Preprocessing image...");
        }

        const preprocessedImage = await preprocessIdCardImage(
            imageSource,
            statusCallback
        );

        // Perform OCR on the preprocessed image
        if (statusCallback) {
            statusCallback(0.3, "Initializing OCR...");
        }

        const result = await Tesseract.recognize(
            preprocessedImage,
            "eng", // Maldivian ID cards use English
            {
                logger: (info) => {
                    // Optional: Log progress
                    if (info.status === "recognizing text") {
                        // Scale progress from 0.3 to 0.9 (60% of total progress)
                        const progress = 0.3 + info.progress * 0.6;
                        const progressPercent = Math.round(progress * 100);
                        console.log(`OCR Progress: ${progressPercent}%`);
                        if (statusCallback) {
                            statusCallback(
                                progress,
                                `Recognizing text... ${progressPercent}%`
                            );
                        }
                    } else if (statusCallback) {
                        const progress = 0.3 + (info.progress || 0) * 0.6;
                        statusCallback(progress, info.status);
                    }
                },
            }
        );

        if (statusCallback) {
            statusCallback(0.95, "Parsing extracted text...");
        }

        const text = result.data.text;
        console.log("OCR Text:", text);

        // Parse the extracted text
        const parsedData = parseNationalIdText(text);

        if (statusCallback) {
            statusCallback(1, "Complete!");
        }

        return parsedData;
    } catch (error) {
        console.error("Error extracting ID card information:", error);
        throw new Error("Failed to extract information from ID card image");
    }
}

/**
 * Preprocess ID card image by detecting and aligning the card
 * @param {File|Blob|string} imageSource - Image file, blob, or data URL
 * @param {Function} statusCallback - Optional callback for progress updates
 * @returns {Promise<string>} Preprocessed image as data URL
 */
async function preprocessIdCardImage(imageSource, statusCallback) {
    try {
        // Dynamically import OpenCV
        if (statusCallback) {
            statusCallback(0.05, "Loading image processor...");
        }

        const cv = await loadOpenCV();

        if (statusCallback) {
            statusCallback(0.1, "Loading image...");
        }

        // Convert image source to Image element
        const img = await loadImageElement(imageSource);

        if (statusCallback) {
            statusCallback(0.15, "Detecting ID card...");
        }

        // Create canvas and get image data
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        // Load image into OpenCV Mat
        const src = cv.imread(canvas);

        // Try to detect and align the ID card
        const aligned = detectAndAlignIdCard(cv, src, statusCallback);

        // Convert back to data URL
        if (statusCallback) {
            statusCallback(0.25, "Finalizing preprocessed image...");
        }

        const outputCanvas = document.createElement("canvas");
        cv.imshow(outputCanvas, aligned);
        const dataUrl = outputCanvas.toDataURL("image/png");

        // Clean up
        src.delete();
        aligned.delete();

        if (statusCallback) {
            statusCallback(0.3, "Image preprocessing complete");
        }

        return dataUrl;
    } catch (error) {
        console.error("Error preprocessing image:", error);
        console.log("Falling back to original image");
        // If preprocessing fails, fall back to original image
        if (imageSource instanceof Blob || imageSource instanceof File) {
            return await blobToDataURL(imageSource);
        }
        return imageSource;
    }
}

/**
 * Detect and align ID card in the image using perspective transformation
 * @param {Object} cv - OpenCV.js instance
 * @param {Mat} src - Source image
 * @param {Function} statusCallback - Optional callback for progress updates
 * @returns {Mat} Aligned image
 */
function detectAndAlignIdCard(cv, src, statusCallback) {
    try {
        // Convert to grayscale
        if (statusCallback) {
            statusCallback(0.16, "Converting to grayscale...");
        }
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // Apply Gaussian blur to reduce noise
        if (statusCallback) {
            statusCallback(0.17, "Reducing noise...");
        }
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

        // Detect edges using Canny edge detection
        if (statusCallback) {
            statusCallback(0.18, "Detecting edges...");
        }
        const edges = new cv.Mat();
        cv.Canny(
            blurred,
            edges,
            CANNY_THRESHOLD_LOW,
            CANNY_THRESHOLD_HIGH,
            CANNY_APERTURE_SIZE,
            false
        );

        // Find contours
        if (statusCallback) {
            statusCallback(0.19, "Finding contours...");
        }
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(
            edges,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );

        // Find the largest quadrilateral contour
        if (statusCallback) {
            statusCallback(0.2, "Identifying ID card...");
        }
        let maxArea = 0;
        let bestContour = null;

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);

            // Approximate the contour to a polygon
            const peri = cv.arcLength(contour, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.02 * peri, true);

            // Check if it's a quadrilateral and has significant area
            if (approx.rows === 4 && area > maxArea) {
                maxArea = area;
                if (bestContour) {
                    bestContour.delete();
                }
                bestContour = approx.clone();
            }

            approx.delete();
        }

        // Clean up temporary Mats
        gray.delete();
        blurred.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();

        // If we found a quadrilateral, perform perspective transformation
        if (
            bestContour &&
            maxArea > src.rows * src.cols * MIN_CONTOUR_AREA_RATIO
        ) {
            if (statusCallback) {
                statusCallback(0.22, "Aligning ID card...");
            }

            const result = performPerspectiveTransform(cv, src, bestContour);
            bestContour.delete();
            return result;
        }

        // If no suitable contour found, return original
        if (bestContour) {
            bestContour.delete();
        }
        console.log("No ID card detected, using original image");
        return src.clone();
    } catch (error) {
        console.error("Error in detectAndAlignIdCard:", error);
        // Return original image on error
        return src.clone();
    }
}

/**
 * Perform perspective transformation to align the ID card
 * @param {Object} cv - OpenCV.js instance
 * @param {Mat} src - Source image
 * @param {Mat} contour - Quadrilateral contour points
 * @returns {Mat} Transformed image
 */
function performPerspectiveTransform(cv, src, contour) {
    try {
        // Get the four corner points
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
        const orderedPoints = [
            topPoints[0],
            topPoints[1],
            bottomPoints[1],
            bottomPoints[0],
        ];

        // Calculate the width and height of the output image
        const widthTop = Math.sqrt(
            Math.pow(orderedPoints[1].x - orderedPoints[0].x, 2) +
                Math.pow(orderedPoints[1].y - orderedPoints[0].y, 2)
        );
        const widthBottom = Math.sqrt(
            Math.pow(orderedPoints[2].x - orderedPoints[3].x, 2) +
                Math.pow(orderedPoints[2].y - orderedPoints[3].y, 2)
        );
        const maxWidth = Math.max(widthTop, widthBottom);

        const heightLeft = Math.sqrt(
            Math.pow(orderedPoints[3].x - orderedPoints[0].x, 2) +
                Math.pow(orderedPoints[3].y - orderedPoints[0].y, 2)
        );
        const heightRight = Math.sqrt(
            Math.pow(orderedPoints[2].x - orderedPoints[1].x, 2) +
                Math.pow(orderedPoints[2].y - orderedPoints[1].y, 2)
        );
        const maxHeight = Math.max(heightLeft, heightRight);

        // Create source and destination point matrices
        const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            orderedPoints[0].x,
            orderedPoints[0].y,
            orderedPoints[1].x,
            orderedPoints[1].y,
            orderedPoints[2].x,
            orderedPoints[2].y,
            orderedPoints[3].x,
            orderedPoints[3].y,
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

        // Apply transformation
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
        console.error("Error in performPerspectiveTransform:", error);
        return src.clone();
    }
}

/**
 * Load OpenCV.js dynamically
 * @returns {Promise<Object>} OpenCV.js instance
 */
async function loadOpenCV() {
    // Check if OpenCV is already loaded
    if (window.cv && window.cv.Mat) {
        return window.cv;
    }

    // Import OpenCV
    const cv = await import("@techstark/opencv-js");

    // Wait for OpenCV to be ready
    return new Promise((resolve) => {
        cv.default().then((cvInstance) => {
            window.cv = cvInstance;
            resolve(cvInstance);
        });
    });
}

/**
 * Load image from various sources into an Image element
 * @param {File|Blob|string} imageSource - Image source
 * @returns {Promise<HTMLImageElement>} Image element
 */
function loadImageElement(imageSource) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => resolve(img);
        img.onerror = reject;

        if (typeof imageSource === "string") {
            img.src = imageSource;
        } else if (imageSource instanceof Blob || imageSource instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageSource);
        } else {
            reject(new Error("Unsupported image source type"));
        }
    });
}

/**
 * Convert Blob to Data URL
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Data URL
 */
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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
        /\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/,
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
