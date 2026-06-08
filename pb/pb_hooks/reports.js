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

    console.log(department.description);

    return "<html><body><h1>OT List Report</h1></body></html>";
};

module.exports = {
    getOtListHTMLReport,
};
