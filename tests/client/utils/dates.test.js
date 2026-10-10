import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    formatUtcOffset,
    hospitalToday,
    hospitalUtcOffset,
    setAppSettings,
} from "@/lib/app-settings";
import {
    age,
    calendarDate,
    formatDate,
    formatDateTime,
    formatTime,
    formatTimestampDate,
    formateDateLong,
    hospitalTime,
} from "@/utils/dates";
import { insertDayInOrder, isInMonth } from "@/utils/ot-days";

// See "Time zone" in the README. The hospital here is at UTC+5, and the
// tests run behind UTC (vitest.config.js), so the browser's clock and the
// hospital's disagree about the day for much of it.
const HOSPITAL = { utcOffsetMinutes: 300 };

// 20:30 UTC on 1 March: already 2 March at the hospital, still 1 March where
// the tests run.
const EVENING_UTC = "2026-03-01T20:30:00.000Z";

beforeEach(() => {
    setAppSettings(HOSPITAL);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("the test environment", () => {
    it("runs behind UTC, so a local-zone read of a stored date is the day before", () => {
        expect(new Date("2026-03-01T00:00:00.000Z").getDate()).toBe(28);
    });
});

describe("calendar dates", () => {
    it("reads a stored date as that date, whatever the browser's zone", () => {
        expect(calendarDate("2026-03-01 00:00:00.000Z").format("YYYY-MM-DD")).toBe(
            "2026-03-01",
        );
        expect(formatDate("2026-03-01 00:00:00.000Z")).toBe("1 Mar 2026");
        expect(formateDateLong("2026-03-01 00:00:00.000Z").trim()).toBe(
            "Sunday, 01 Mar 2026",
        );
    });

    it("gives an invalid date for an empty value", () => {
        expect(calendarDate("").isValid()).toBe(false);
        expect(calendarDate(null).isValid()).toBe(false);
    });

    it("places an OT day in its own month, not the browser's reading of it", () => {
        expect(isInMonth("2026-03-01 00:00:00.000Z", 2026, 3)).toBe(true);
        expect(isInMonth("2026-03-01 00:00:00.000Z", 2026, 2)).toBe(false);
        expect(isInMonth("2026-01-01 00:00:00.000Z", 2026, 1)).toBe(true);
    });
});

describe("timestamps", () => {
    it("shows a moment on the hospital's clock", () => {
        expect(formatDateTime("2026-03-01 20:30:00.000Z")).toBe("2 Mar 2026 01:30");
        expect(formatTimestampDate("2026-03-01 20:30:00.000Z")).toBe("2 Mar 2026");
        expect(formatTime("2026-03-01 20:30:00.000Z")).toBe("01:30");
    });

    it("follows the setting when it changes", () => {
        setAppSettings({ utcOffsetMinutes: -480 });

        expect(formatDateTime("2026-03-01 20:30:00.000Z")).toBe("1 Mar 2026 12:30");
    });

    it("falls back to the browser's zone when the settings did not load", () => {
        setAppSettings(null);

        expect(hospitalUtcOffset()).toBeNull();
        expect(hospitalTime("2026-03-01 20:30:00.000Z").format("D MMM HH:mm")).toBe(
            "1 Mar 12:30",
        );
    });
});

describe("today at the hospital", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(EVENING_UTC));
    });

    it("is the hospital's date, not UTC's or the browser's", () => {
        expect(hospitalToday()).toBe("2026-03-02");
    });

    it("uses the settings it is handed over the shared copy", () => {
        expect(hospitalToday({ utcOffsetMinutes: -480 })).toBe("2026-03-01");
        expect(hospitalToday({ utcOffsetMinutes: 0 })).toBe("2026-03-01");
    });

    it("turns a patient a year older on their birthday at the hospital", () => {
        expect(age("2010-03-02 00:00:00.000Z")).toBe(16);
        expect(age("2010-03-03 00:00:00.000Z")).toBe(15);
    });

    it("gives an infant's age in months, and a newborn's in days", () => {
        expect(age("2025-12-02 00:00:00.000Z")).toBe("3 months");
        expect(age("2026-02-20 00:00:00.000Z")).toBe("10 days");
    });
});

describe("formatUtcOffset", () => {
    it("writes an offset as UTC±hh:mm", () => {
        expect(formatUtcOffset(300)).toBe("UTC+05:00");
        expect(formatUtcOffset(330)).toBe("UTC+05:30");
        expect(formatUtcOffset(-480)).toBe("UTC-08:00");
        expect(formatUtcOffset(0)).toBe("UTC+00:00");
    });
});

describe("insertDayInOrder", () => {
    const day = (date) => ({ date: `${date} 00:00:00.000Z` });
    const dates = (days) => days.map((d) => d.date.slice(0, 10));

    it("inserts a day where its date belongs", () => {
        const days = [day("2026-03-01"), day("2026-03-08")];

        expect(dates(insertDayInOrder(days, day("2026-03-04")))).toEqual([
            "2026-03-01",
            "2026-03-04",
            "2026-03-08",
        ]);
        expect(dates(insertDayInOrder(days, day("2026-02-20")))[0]).toBe(
            "2026-02-20",
        );
        expect(dates(insertDayInOrder(days, day("2026-03-20")))[2]).toBe(
            "2026-03-20",
        );
    });

    it("does not mutate the list it was given", () => {
        const days = [day("2026-03-01")];

        insertDayInOrder(days, day("2026-03-04"));

        expect(days).toHaveLength(1);
    });
});
