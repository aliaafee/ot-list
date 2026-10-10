import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    bedInfoFromHINAIHeader,
    patientInfoFromHINAIHeader,
    patientInfoFromText,
    patientInfoFromVinavi,
} from "@/utils/text-parsers";

// Patient details pasted from the hospital's two systems. Both samples are
// made up, in the shape each system copies out.

const HINAI = [
    "Mr FIRSTNAME LAST NAME ( MALE | 10 Years 5 Months (01-Jan-1990) )  visitStatus:IP Bed Type/Location/BED NO :NORMAL/SURGICAL WARD/ SW-33\tIGMH0000012345",
    "NATIONAL ID : A000000 Mobile No : 7123456 Address : ISLAND, Atoll, Atoll, COUNTRY , Blood group : ``O`` POSITIVE , G6PD : 1410",
].join("\n");

const VINAVI = [
    "Firstname Lastname Othername",
    "40 years 1 month",
    "A0123456",
    "1234567",
    "Female",
    "",
    "17 Jan 1980",
    "",
    "Some House , K. Someisland",
    "",
    "7123456",
].join("\n");

beforeEach(() => {
    // bedInfoFromHINAIHeader logs the line it is reading.
    vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("patientInfoFromHINAIHeader", () => {
    it("reads every field of a HINAI header", () => {
        expect(patientInfoFromHINAIHeader(HINAI)).toEqual({
            name: "FIRSTNAME LAST NAME",
            sex: "male",
            dateOfBirth: "1990-01-01",
            hospitalId: "IGMH0000012345",
            nid: "A000000",
            phone: "7123456",
            address: "ISLAND, Atoll, Atoll, COUNTRY",
        });
    });

    it("drops the title from the name, whichever it is", () => {
        const as = (title) =>
            patientInfoFromHINAIHeader(HINAI.replace("Mr ", `${title} `)).name;

        expect(as("Mrs")).toBe("FIRSTNAME LAST NAME");
        expect(as("Miss")).toBe("FIRSTNAME LAST NAME");
    });

    it("refuses text that is not a HINAI header", () => {
        expect(() => patientInfoFromHINAIHeader("one line only")).toThrow(
            /at least 2 lines/,
        );
        expect(() =>
            patientInfoFromHINAIHeader("no brackets here IGMH0000012345\nsecond"),
        ).toThrow(/in parentheses/);
        expect(() =>
            patientInfoFromHINAIHeader("Mr NAME ( MALE | x )\nsecond"),
        ).toThrow(/IGMH Hospital ID/);
    });
});

describe("bedInfoFromHINAIHeader", () => {
    const withBed = (bed) => HINAI.replace("NORMAL/SURGICAL WARD/ SW-33", bed);

    it("reads the bed after the second slash", () => {
        expect(bedInfoFromHINAIHeader(HINAI)).toBe("SW-33");
        expect(
            bedInfoFromHINAIHeader(withBed("NORMAL/DHARUMAVANTHA 17/ 17-08")),
        ).toBe("17-08");
    });

    it("prefixes a bare bed number with a one-word location", () => {
        expect(bedInfoFromHINAIHeader(withBed("NORMAL/ICCU/ 12"))).toBe("ICCU12");
    });

    it("leaves a bed that already carries its own prefix as it is", () => {
        expect(bedInfoFromHINAIHeader(withBed("ICU & CCU/ICCU/ ICU12"))).toBe(
            "ICU12",
        );
    });

    it("gives an empty string when there is no bed", () => {
        expect(bedInfoFromHINAIHeader("Mr NAME ( MALE | x )")).toBe("");
    });
});

describe("patientInfoFromVinavi", () => {
    it("reads the fields by line", () => {
        expect(patientInfoFromVinavi(VINAVI)).toEqual({
            name: "Firstname Lastname Othername",
            nid: "A0123456",
            hospitalId: "",
            sex: "female",
            dateOfBirth: "1980-01-17",
            address: "Some House , K. Someisland",
            phone: "7123456",
        });
    });

    it("refuses text with too few lines", () => {
        expect(() => patientInfoFromVinavi("Name\n40 years\nA0123456")).toThrow(
            /at least 6 lines/,
        );
    });
});

describe("patientInfoFromText", () => {
    it("tells the two formats apart by the IGMH hospital id", () => {
        expect(patientInfoFromText(HINAI).hospitalId).toBe("IGMH0000012345");
        expect(patientInfoFromText(VINAVI).name).toBe(
            "Firstname Lastname Othername",
        );
    });

    it("leaves out fields it did not find, so a merge does not blank them", () => {
        expect(patientInfoFromText(VINAVI)).not.toHaveProperty("hospitalId");
        expect(Object.values(patientInfoFromText(VINAVI))).not.toContain("");
    });
});
