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
        let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        if (now.getDate() < birth.getDate()) months--;
        if (months < 1) {
            const days = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
            return `${days} days`;
        }
        return `${months} months`;
    }
    return years;
}

const sexShort = (sex) => {
    return sex ? sex[0].toUpperCase() : "-";
}

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
        tableRows = [...tableRows, [room.name]]
        const procedureRecords = $app.findRecordsByFilter(
            "procedures",
            `procedureDay="${otDay.id}" && operatingRoom="${room.id}"`
        )
        procedureRecords.forEach(
            (procedureRecord) => {
                $app.expandRecord(procedureRecord, ["patient"]);
                const patientRecord = procedureRecord.expandedOne("patient");
                const patient = patientRecord.publicExport();
                const procedure = procedureRecord.publicExport();
                tableRows = [...tableRows, [
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
                    ""
                ]]
            }
        )
    })

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
        type: "text/html"
    }
};

const getOtListPdfReport = (otDayId) => {
    //Generate a pdf and return, this is place holder for now
    return getOtListHTMLReport(otDayId)
}

module.exports = {
    getOtListHTMLReport,
    getOtListPdfReport
};
