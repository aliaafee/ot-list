/**
 * Minimal RFC 4180 CSV writer, and a file-download helper.
 *
 * Mirrors the parser in scripts/build-catalogue-seed.mjs: any field
 * containing a comma, quote or newline is quoted, everything else is
 * written bare. The seed CSVs under specs/procedure_coding_system are
 * written by hand in that same style, so a file this produces can be
 * pasted straight into one of them.
 */

/** Quote a field only when it needs it, doubling any embedded quotes. */
function csvField(value) {
    const text = value === null || value === undefined ? "" : String(value);
    if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

/**
 * Builds a CSV document from a header row and an array of row objects,
 * each keyed by the header names.
 *
 * @param {string[]} headers - Column names, in order, and the keys read
 *   off each row.
 * @param {Object[]} rows
 * @returns {string} The CSV text, ending in a trailing newline.
 */
export function toCsv(headers, rows) {
    const lines = [headers.join(",")];
    for (const row of rows) {
        lines.push(headers.map((h) => csvField(row[h])).join(","));
    }
    return lines.join("\n") + "\n";
}

/** Triggers a browser download of `content` as a file named `filename`. */
export function downloadTextFile(filename, content, mimeType = "text/csv") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
