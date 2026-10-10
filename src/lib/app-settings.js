import { useEffect, useSyncExternalStore } from "react";
import dayjs from "dayjs";

import { pb } from "@/lib/pb";

/**
 * App settings - the one `appSettings` record, shared by every component that
 * reads it.
 *
 * Held at module level and loaded once: it is a single small record that only
 * an admin changes, and the checklist of every expanded row reads it. The
 * settings page pushes its saves back in through `setAppSettings`, so nothing
 * here needs a subscription.
 */

/** The single record's id, fixed by the appSettings migration. */
export const APP_SETTINGS_ID = "appsettings0001";

let settings = null;
// Whether a load has finished, either way. The signed-in app waits for this
// before it renders, so nothing asks what day it is and gets the browser's
// answer because the settings were still on their way.
let settled = false;
let pending = null;
const listeners = new Set();

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Replace the shared copy, e.g. with the record a save returned. */
export function setAppSettings(record) {
    settings = record;
    settled = true;
    listeners.forEach((listener) => listener());
}

/**
 * Load the settings once; later calls share the same request.
 *
 * `client` is the PocketBase client to read with: the signed-in user's by
 * default, or the superuser's on the backups page, which has no user session.
 */
export function loadAppSettings(client = pb) {
    if (!pending) {
        pending = client
            .collection("appSettings")
            // Not auto-cancelled: several rows can ask in the same tick.
            .getOne(APP_SETTINGS_ID, { requestKey: null })
            .then((record) => {
                setAppSettings(record);
                return record;
            })
            .catch((error) => {
                console.error("Failed to load app settings:", error);
                // Let the next reader try again, and let the app through on
                // the browser's date rather than holding it at a spinner.
                pending = null;
                settled = true;
                listeners.forEach((listener) => listener());
                return null;
            });
    }
    return pending;
}

/** Whether the settings have loaded, or failed to and will not be waited on. */
export function useAppSettingsSettled() {
    return useSyncExternalStore(subscribe, () => settled);
}

/** The settings record, or null until it has loaded. */
export function useAppSettings() {
    const current = useSyncExternalStore(subscribe, () => settings);
    useEffect(() => {
        loadAppSettings();
    }, []);
    return current;
}

/**
 * Today's date at the hospital, as "YYYY-MM-DD".
 *
 * The one answer to "what day is it" on the client: the same arithmetic as
 * the server's todayDate, from the same setting, so both draw the
 * past/upcoming line on the same day. If the settings could not be loaded it
 * is the browser's date, which is right for anyone at the hospital.
 *
 * A component whose output depends on it passes what `useAppSettings`
 * returned, so it re-renders when the settings arrive or change. Anything
 * else - an event handler, a query, a util - calls it bare and gets the
 * shared copy, which is loaded at sign-in.
 */
export function hospitalToday(appSettings = settings) {
    if (!appSettings) return dayjs().format("YYYY-MM-DD");
    return new Date(Date.now() + (appSettings.utcOffsetMinutes || 0) * 60000)
        .toISOString()
        .slice(0, 10);
}

/**
 * The hospital's offset from UTC in minutes, or null if the settings could
 * not be loaded. What `hospitalTime` in utils/dates shows timestamps at.
 */
export function hospitalUtcOffset() {
    return settings ? settings.utcOffsetMinutes || 0 : null;
}

/** "UTC+05:30", "UTC-08:00", "UTC+00:00". */
export function formatUtcOffset(minutes) {
    const sign = minutes < 0 ? "-" : "+";
    const abs = Math.abs(minutes);
    const pad = (n) => String(n).padStart(2, "0");
    return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Every UTC offset in use, in minutes ahead of UTC. */
export const UTC_OFFSETS = [
    -720, -660, -600, -570, -540, -480, -420, -360, -300, -240, -210, -180,
    -120, -60, 0, 60, 120, 180, 210, 240, 270, 300, 330, 345, 360, 390, 420,
    480, 525, 540, 570, 600, 630, 660, 720, 765, 780, 840,
];
