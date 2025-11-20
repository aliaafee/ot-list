import dayjs from "dayjs";

export function age(dateOfBirth) {
    const years = dayjs().diff(dateOfBirth, "year");
    if (years < 1) {
        const months = dayjs().diff(dateOfBirth, "month");
        if (months < 1) {
            return `${dayjs().diff(dateOfBirth, "days")} days`;
        }
        return `${months} months`;
    }
    return years;
}

export function formatDateTime(dateTime) {
    return dayjs(dateTime).format("D MMM YYYY HH:mm");
}
