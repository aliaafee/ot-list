import dayjs from "dayjs";

export function age(dateOfBirth) {
    return dayjs().diff(dateOfBirth, "year");
}
