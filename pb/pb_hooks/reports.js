const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const formatDate = (dateTime) => {
    //Formate date to D MMM YYYY
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // Months are zero indexed

    const monthName = monthNames[month - 1];
    const day = date.getDate();
    console.log(date, year, month, day);
    return `${day} ${monthName} ${year}`;
};

const age = (dob) => {
    const birth = new Date(dob);
    const now = new Date();

    let years = now.getFullYear() - birth.getFullYear();
    if (isNaN(years) || years < 0) return "-";

    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
    if (years < 1) {
        let months =
            (now.getFullYear() - birth.getFullYear()) * 12 +
            (now.getMonth() - birth.getMonth());
        if (now.getDate() < birth.getDate()) months--;
        if (months < 1) {
            const days = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
            return `${days} days`;
        }
        return `${months} months`;
    }
    return years;
};

const sexShort = (sex) => {
    return sex ? sex[0].toUpperCase() : "-";
};

// Manual base64 encoding for PocketBase/Goja environment
const base64Encode = (str) => {
    const base64chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytes = [];

    // Convert string to UTF-8 bytes
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 128) {
            bytes.push(c);
        } else if (c < 2048) {
            bytes.push(192 | (c >> 6));
            bytes.push(128 | (c & 63));
        } else if (c < 65536) {
            bytes.push(224 | (c >> 12));
            bytes.push(128 | ((c >> 6) & 63));
            bytes.push(128 | (c & 63));
        } else {
            bytes.push(240 | (c >> 18));
            bytes.push(128 | ((c >> 12) & 63));
            bytes.push(128 | ((c >> 6) & 63));
            bytes.push(128 | (c & 63));
        }
    }

    // Encode bytes to base64
    let result = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const byte1 = bytes[i];
        const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

        result += base64chars[byte1 >> 2];
        result += base64chars[((byte1 & 3) << 4) | (byte2 >> 4)];
        result +=
            i + 1 < bytes.length
                ? base64chars[((byte2 & 15) << 2) | (byte3 >> 6)]
                : "=";
        result += i + 2 < bytes.length ? base64chars[byte3 & 63] : "=";
    }

    return result;
};

const getOtListHTMLReport = (otDayId) => {
    const otDayRecord = $app.findRecordById("otDays", otDayId);

    const otDay = otDayRecord.publicExport();

    $app.expandRecord(otDayRecord, ["otList"], null);

    const otListRecord = otDayRecord.expandedOne("otList");
    const otList = otListRecord.publicExport();

    $app.expandRecord(otListRecord, ["department", "operatingRooms"], null);

    const departmentRecord = otListRecord.expandedOne("department");
    const department = departmentRecord.publicExport();

    const operatingRoomsRecords = otListRecord.expandedAll("operatingRooms");

    let tableRows = [];

    operatingRoomsRecords.forEach((roomRecord) => {
        const room = roomRecord.publicExport();
        tableRows = [...tableRows, [room.name]];
        const procedureRecords = $app.findRecordsByFilter(
            "procedures",
            `procedureDay="${otDay.id}" && operatingRoom="${room.id}"`,
        );
        procedureRecords.forEach((procedureRecord) => {
            $app.expandRecord(procedureRecord, ["patient"]);
            const patientRecord = procedureRecord.expandedOne("patient");
            const patient = patientRecord.publicExport();
            const procedure = procedureRecord.publicExport();
            tableRows = [
                ...tableRows,
                [
                    procedure.order,
                    procedure.bed,
                    patient.nid,
                    patient.name,
                    `${age(patient.dateOfBirth)} / ${sexShort(patient.sex)}`,
                    procedure.diagnosis,
                    procedure.procedure,
                    `${department.name} Team`,
                    procedure.comorbids,
                    procedure.requirements,
                    procedure.anesthesia,
                    patient.phone,
                    "",
                ],
            ];
        });
    });

    const html = $template
        .loadFiles(
            `${__hooks}/templates/print-layout.html`,
            `${__hooks}/templates/otlist-print.html`,
        )
        .render({
            departmentName: department.name,
            date: formatDate(otDay.date),
            otListName: otList.name,
            tableRows: tableRows,
        });

    return {
        content: html,
        type: "text/html",
    };
};

const getOtListPdfReport = (otDayId) => {
    // Generate HTML report
    const htmlReport = getOtListHTMLReport(otDayId);

    // Create temporary file paths
    const htmlFile = $filepath.join($app.dataDir(), `report_${otDayId}.html`);
    const pdfFile = $filepath.join($app.dataDir(), `report_${otDayId}.pdf`);

    try {
        // Write HTML content to temporary file
        console.log("Writing HTML report to temporary file:", htmlFile);
        console.log("HTML content length:", htmlReport.content.length);

        // Base64 encode the HTML content and use PowerShell to write
        const b64 = base64Encode(htmlReport.content);
        console.log("Base64 encoded, length:", b64.length);

        // Use $os.exec to write the HTML file
        const psCmd = `[IO.File]::WriteAllBytes('${htmlFile.replace(/\\/g, "\\\\")}', [Convert]::FromBase64String('${b64}'))`;
        const writeResult = $os.exec(
            "powershell",
            "-NoProfile",
            "-Command",
            psCmd,
        );

        console.log("PowerShell write exit code:", writeResult);

        // Call pandoc to convert HTML to PDF
        console.log("Calling pandoc to generate PDF...");
        const pandocResult = $os.exec(
            "pandoc",
            htmlFile,
            "-o",
            pdfFile,
            "-f",
            "html",
            "-t",
            "pdf",
        );

        console.log("Pandoc exit code:", pandocResult);

        // Check if PDF file was created
        const pdfCheckResult = $os.exec(
            "cmd",
            "/c",
            `if exist "${pdfFile}" (echo PDF_EXISTS) else (echo PDF_NOTFOUND)`,
        );
        console.log("PDF file check exit code:", pdfCheckResult);

        // Read the generated PDF file
        const pdfContent = $os.readFile(pdfFile);

        // Clean up temporary files
        try {
            $os.remove(htmlFile);
        } catch (e) {
            console.log("Warning: Could not remove HTML temp file:", e);
        }
        try {
            $os.remove(pdfFile);
        } catch (e) {
            console.log("Warning: Could not remove PDF temp file:", e);
        }

        return {
            content: pdfContent,
            type: "application/pdf",
        };
    } catch (error) {
        console.error("PDF generation error:", error);
        // Clean up on error
        try {
            $os.remove(htmlFile);
        } catch (e) {}
        try {
            $os.remove(pdfFile);
        } catch (e) {}
        throw error;
    }
};

const getOtListDocxReport = (otDayId) => {
    // Generate HTML report
    const htmlReport = getOtListHTMLReport(otDayId);

    // Create temporary file paths
    const htmlFile = $filepath.join($app.dataDir(), `report_${otDayId}.html`);
    const docxFile = $filepath.join($app.dataDir(), `report_${otDayId}.docx`);

    try {
        // Write HTML content to temporary file
        console.log("Writing HTML report to temporary file:", htmlFile);
        console.log("HTML content length:", htmlReport.content.length);

        // Base64 encode the HTML content and use PowerShell to write
        const b64 = base64Encode(htmlReport.content);
        console.log("Base64 encoded, length:", b64.length);

        // Use $os.exec to write the HTML file
        const psCmd = `[IO.File]::WriteAllBytes('${htmlFile.replace(/\\/g, "\\\\")}', [Convert]::FromBase64String('${b64}'))`;
        const writeResult = $os.exec(
            "powershell",
            "-NoProfile",
            "-Command",
            psCmd,
        );

        console.log("PowerShell write exit code:", writeResult);

        // Call pandoc to convert HTML to DOCX
        console.log("Calling pandoc to generate DOCX...");
        const pandocResult = $os.exec(
            "pandoc",
            htmlFile,
            "-o",
            docxFile,
            "-f",
            "html",
            "-t",
            "docx",
        );

        console.log("Pandoc exit code:", pandocResult);

        // Check if DOCX file was created
        const docxCheckResult = $os.exec(
            "cmd",
            "/c",
            `if exist "${docxFile}" (echo DOCX_EXISTS) else (echo DOCX_NOTFOUND)`,
        );
        console.log("DOCX file check exit code:", docxCheckResult);

        // Read the generated DOCX file
        const docxContent = $os.readFile(docxFile);

        // Clean up temporary files
        try {
            $os.remove(htmlFile);
        } catch (e) {
            console.log("Warning: Could not remove HTML temp file:", e);
        }
        try {
            $os.remove(docxFile);
        } catch (e) {
            console.log("Warning: Could not remove DOCX temp file:", e);
        }

        return {
            content: docxContent,
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
    } catch (error) {
        console.error("DOCX generation error:", error);
        // Clean up on error
        try {
            $os.remove(htmlFile);
        } catch (e) {}
        try {
            $os.remove(docxFile);
        } catch (e) {}
        throw error;
    }
};

module.exports = {
    getOtListHTMLReport,
    getOtListPdfReport,
    getOtListDocxReport,
};
