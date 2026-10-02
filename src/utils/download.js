/**
 * Saves a blob as a file, by clicking a temporary link to it.
 */
export function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/** Saves data as an indented JSON file. */
export function downloadJson(data, fileName) {
    downloadBlob(
        new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        }),
        fileName,
    );
}
