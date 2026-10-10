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

// A calendar date (an OT day) as D MMM YYYY. Read from its date part, never
// through a Date: the server's zone must not move it to the day before.
const formatDate = (dateTime) => {
    const parts = dateParts(dateTime);
    if (!parts) return "";
    const [year, month, day] = parts;
    return `${day} ${monthNames[month - 1]} ${year}`;
};

/** "YYYY-MM-DD" as [year, month, day], or null. */
const dateParts = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

// Age as of today at the hospital (the app setting), on calendar dates: the
// server's own clock and zone play no part, so the printed list shows the
// same age the app does.
const age = (dob) => {
    const { todayDate } = require(`${__hooks}/app-settings.js`);
    const birth = dateParts(dob);
    const now = dateParts(todayDate($app));
    if (!birth || !now) return "-";

    const [by, bm, bd] = birth;
    const [ny, nm, nd] = now;

    let years = ny - by;
    if (years < 0) return "-";

    const m = nm - bm;
    if (m < 0 || (m === 0 && nd < bd)) years--;
    if (years < 1) {
        let months = (ny - by) * 12 + (nm - bm);
        if (nd < bd) months--;
        if (months < 1) {
            const days = Math.round(
                (Date.UTC(ny, nm - 1, nd) - Date.UTC(by, bm - 1, bd)) /
                    (1000 * 60 * 60 * 24),
            );
            return `${days} days`;
        }
        return `${months} months`;
    }
    return years;
};

const sexShort = (sex) => {
    return sex ? sex[0].toUpperCase() : "-";
};

const findProceduresByOtDayAndRoom = (otDayId, roomId) => {
    let records = arrayOf(new Record());

    $app.recordQuery("procedures")
        .andWhere(
            $dbx.hashExp({
                procedureDay: otDayId,
                operatingRoom: roomId,
            }),
        )
        .andWhere($dbx.hashExp({ removed: false }))
        .orderBy("order ASC")
        .all(records);

    return records;
};

const getOtListHTMLReport = (otDayId) => {
    const { describeProcedureCodes } = require(`${__hooks}/procedure-codes.js`);

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

        const procedureRecords = findProceduresByOtDayAndRoom(otDayId, room.id);

        if (procedureRecords.length === 0) {
            tableRows = [...tableRows, ["No procedures", ""]];
        }

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
                    describeProcedureCodes($app, procedureRecord),
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
            departmentName: department.description,
            date: formatDate(otDay.date),
            otListName: otList.name,
            tableRows: tableRows,
        });

    return {
        content: html,
        type: "text/html",
    };
};

// const getOtListPdfReport = (otDayId) => {
//     // Generate HTML report
//     const htmlReport = getOtListHTMLReport(otDayId);

//     // Create temporary file paths
//     const htmlFile = $filepath.join($app.dataDir(), `report_${otDayId}.html`);
//     const pdfFile = $filepath.join($app.dataDir(), `report_${otDayId}.pdf`);

//     try {
//         // Write HTML content to temporary file
//         console.log("Writing HTML report to temporary file:", htmlFile);
//         console.log("HTML content length:", htmlReport.content.length);

//         // Base64 encode the HTML content and use PowerShell to write
//         const b64 = base64Encode(htmlReport.content);
//         console.log("Base64 encoded, length:", b64.length);

//         // Use $os.exec to write the HTML file
//         const psCmd = `[IO.File]::WriteAllBytes('${htmlFile.replace(/\\/g, "\\\\")}', [Convert]::FromBase64String('${b64}'))`;
//         const writeResult = $os.exec(
//             "powershell",
//             "-NoProfile",
//             "-Command",
//             psCmd,
//         );

//         console.log("PowerShell write exit code:", writeResult);

//         // Call pandoc to convert HTML to PDF
//         console.log("Calling pandoc to generate PDF...");
//         const pandocResult = $os.exec(
//             "pandoc",
//             htmlFile,
//             "-o",
//             pdfFile,
//             "-f",
//             "html",
//             "-t",
//             "pdf",
//         );

//         console.log("Pandoc exit code:", pandocResult);

//         // Check if PDF file was created
//         const pdfCheckResult = $os.exec(
//             "cmd",
//             "/c",
//             `if exist "${pdfFile}" (echo PDF_EXISTS) else (echo PDF_NOTFOUND)`,
//         );
//         console.log("PDF file check exit code:", pdfCheckResult);

//         // Read the generated PDF file
//         const pdfContent = $os.readFile(pdfFile);

//         // Clean up temporary files
//         try {
//             $os.remove(htmlFile);
//         } catch (e) {
//             console.log("Warning: Could not remove HTML temp file:", e);
//         }
//         try {
//             $os.remove(pdfFile);
//         } catch (e) {
//             console.log("Warning: Could not remove PDF temp file:", e);
//         }

//         return {
//             content: pdfContent,
//             type: "application/pdf",
//         };
//     } catch (error) {
//         console.error("PDF generation error:", error);
//         // Clean up on error
//         try {
//             $os.remove(htmlFile);
//         } catch (e) {}
//         try {
//             $os.remove(pdfFile);
//         } catch (e) {}
//         throw error;
//     }
// };

// const getOtListDocxReport = (otDayId) => {
//     // Generate HTML report
//     const htmlReport = getOtListHTMLReport(otDayId);

//     // Create temporary file paths
//     const htmlFile = $filepath.join($app.dataDir(), `report_${otDayId}.html`);
//     const docxFile = $filepath.join($app.dataDir(), `report_${otDayId}.docx`);

//     try {
//         // Write HTML content to temporary file
//         console.log("Writing HTML report to temporary file:", htmlFile);
//         console.log("HTML content length:", htmlReport.content.length);

//         // Base64 encode the HTML content and use PowerShell to write
//         const b64 = base64Encode(htmlReport.content);
//         console.log("Base64 encoded, length:", b64.length);

//         // Use $os.exec to write the HTML file
//         const psCmd = `[IO.File]::WriteAllBytes('${htmlFile.replace(/\\/g, "\\\\")}', [Convert]::FromBase64String('${b64}'))`;
//         const writeResult = $os.exec(
//             "powershell",
//             "-NoProfile",
//             "-Command",
//             psCmd,
//         );

//         console.log("PowerShell write exit code:", writeResult);

//         // Call pandoc to convert HTML to DOCX
//         console.log("Calling pandoc to generate DOCX...");
//         const pandocResult = $os.exec(
//             "pandoc",
//             htmlFile,
//             "-o",
//             docxFile,
//             "-f",
//             "html",
//             "-t",
//             "docx",
//         );

//         console.log("Pandoc exit code:", pandocResult);

//         // Check if DOCX file was created
//         const docxCheckResult = $os.exec(
//             "cmd",
//             "/c",
//             `if exist "${docxFile}" (echo DOCX_EXISTS) else (echo DOCX_NOTFOUND)`,
//         );
//         console.log("DOCX file check exit code:", docxCheckResult);

//         // Read the generated DOCX file
//         const docxContent = $os.readFile(docxFile);

//         // Clean up temporary files
//         try {
//             $os.remove(htmlFile);
//         } catch (e) {
//             console.log("Warning: Could not remove HTML temp file:", e);
//         }
//         try {
//             $os.remove(docxFile);
//         } catch (e) {
//             console.log("Warning: Could not remove DOCX temp file:", e);
//         }

//         return {
//             content: docxContent,
//             type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         };
//     } catch (error) {
//         console.error("DOCX generation error:", error);
//         // Clean up on error
//         try {
//             $os.remove(htmlFile);
//         } catch (e) {}
//         try {
//             $os.remove(docxFile);
//         } catch (e) {}
//         throw error;
//     }
// };

module.exports = {
    getOtListHTMLReport,
    // getOtListPdfReport,
    // getOtListDocxReport,
};
