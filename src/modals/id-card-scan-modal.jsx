import { useState } from "react";
import { CameraIcon, XIcon, UploadIcon, CheckCircleIcon } from "lucide-react";
import ModalWindow from "./modal-window";
import { LoadingSpinner } from "@/components/loading-spinner";
import LabelValue from "@/components/label-value";

function IdCardScanModal({ onComplete, onCancel }) {
    const [scanning, setScanning] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState(null);
    const [extractedInfo, setExtractedInfo] = useState(null);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        await processImage(file);
    };

    const handleCapture = () => {
        // Trigger file input with camera
        document.getElementById("id-card-camera-input").click();
    };

    const processImage = async (imageFile) => {
        setScanning(true);
        setError(null);
        setStatus("Processing image...");

        try {
            // Dynamic import to avoid loading Tesseract until needed
            const { extractInfoFromNationalIdCard } = await import(
                "@/utils/id-card-scanner"
            );

            // Update status callback
            const statusCallback = (progress, message) => {
                setStatus(message);
            };

            const patientInfo = await extractInfoFromNationalIdCard(
                imageFile,
                statusCallback
            );

            setStatus("Extraction complete!");
            setExtractedInfo(patientInfo);
            setScanning(false);
        } catch (err) {
            console.error("Error scanning ID card:", err);
            setError({
                message:
                    err.message ||
                    "Failed to extract information from ID card. Please try again or enter manually.",
            });
            setScanning(false);
        }
    };

    const handleConfirm = () => {
        onComplete(extractedInfo);
    };

    const handleRetry = () => {
        setExtractedInfo(null);
        setError(null);
        setStatus("");
    };

    return (
        <ModalWindow
            title="Scan National ID Card"
            icon={<CameraIcon width={20} height={20} />}
            showButtons={false}
            onCancel={scanning ? null : onCancel}
        >
            <div className="space-y-4">
                {error && (
                    <div className="bg-red-400/20 rounded-md p-3 text-sm">
                        {error.message}
                    </div>
                )}

                {scanning ? (
                    <div className="text-center py-8">
                        <LoadingSpinner className="mx-auto mb-4" />
                        <p className="text-gray-600">{status}</p>
                    </div>
                ) : extractedInfo ? (
                    <>
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircleIcon
                                    width={20}
                                    height={20}
                                    className="text-green-600"
                                />
                                <span className="font-semibold text-green-900">
                                    Information Extracted
                                </span>
                            </div>
                            <p className="text-sm text-green-800">
                                Please verify the information below before
                                confirming.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-md">
                            <LabelValue
                                label="National ID"
                                value={extractedInfo.nid || "Not found"}
                            />
                            <LabelValue
                                label="Name"
                                value={extractedInfo.name || "Not found"}
                                className="md:col-span-2"
                            />
                            <LabelValue
                                label="Date of Birth"
                                value={extractedInfo.dateOfBirth || "Not found"}
                            />
                            <LabelValue
                                label="Sex"
                                value={extractedInfo.sex || "Not found"}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={handleRetry}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Scan Again
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium"
                            >
                                Confirm & Use
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-600">
                            Take a photo or select an image of the patient's
                            National ID card. Make sure the ID is clearly
                            visible and well-lit.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={handleCapture}
                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            >
                                <CameraIcon
                                    width={32}
                                    height={32}
                                    className="mb-2 text-gray-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Take Photo
                                </span>
                            </button>

                            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                                <UploadIcon
                                    width={32}
                                    height={32}
                                    className="mb-2 text-gray-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Select Image
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* Hidden input for camera capture */}
                        <input
                            id="id-card-camera-input"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="text-sm text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                )}
            </div>
        </ModalWindow>
    );
}

export default IdCardScanModal;
