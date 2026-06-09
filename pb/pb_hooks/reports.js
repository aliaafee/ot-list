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

const getOtListHTMLReport = (otDayId) => {
    const otDayRecord = $app.findRecordById("otDays", otDayId);

    const otDay = otDayRecord.publicExport();

    $app.expandRecord(otDayRecord, ["otList"], null);

    console.log(otDay.otList);

    const otListRecord = otDayRecord.expandedOne("otList");
    const otList = otListRecord.publicExport();

    console.log(otList);

    $app.expandRecord(otListRecord, ["department"], null);

    const departmentRecord = otListRecord.expandedOne("department");
    const department = departmentRecord.publicExport();

    const tableRows = [
        [
            "col1",
            "col2",
            "col3",
            "col4",
            "col5",
            "col6",
            "col7",
            "col8",
            "col9",
            "col10",
            "col11",
            "col12",
            "col13",
        ],
        [
            "col1",
            "col2",
            "col3",
            "col4",
            "col5",
            "col6",
            "col7",
            "col8",
            "col9",
            "col10",
            "col11",
            "col12",
            "col13",
        ],
        [
            "col1",
            "col2",
            "col3",
            "col4",
            "col5",
            "col6",
            "col7",
            "col8",
            "col9",
            "col10",
            "col11",
            "col12",
            "col13",
        ],
    ];

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

    return html;
};

module.exports = {
    getOtListHTMLReport,
};
