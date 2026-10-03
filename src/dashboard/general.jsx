import { useEffect, useState } from "react";
import { ClockIcon, SlidersIcon } from "lucide-react";
import dayjs from "dayjs";

import ErrorBanner from "@/components/error-banner";
import FormField from "@/components/form-field";
import SaveStatus from "@/components/save-status";
import { pb } from "@/lib/pb";
import {
    APP_SETTINGS_ID,
    UTC_OFFSETS,
    formatUtcOffset,
    hospitalToday,
    setAppSettings,
    useAppSettings,
} from "@/lib/app-settings";

/**
 * General - settings that apply to the whole app.
 *
 * For now the hospital's time zone, which decides which day is "today"
 * everywhere - see the "Time zone" section of the README. Written as it is
 * chosen, like a template's properties.
 */
export default {
    title: "General",
    icon: <SlidersIcon width={16} height={16} />,
    content: function General({ isAdmin }) {
        const settings = useAppSettings();

        const [error, setError] = useState("");
        const [saving, setSaving] = useState(false);
        const [saved, setSaved] = useState(false);

        useEffect(() => {
            if (!saved) return;
            const timer = setTimeout(() => setSaved(false), 2000);
            return () => clearTimeout(timer);
        }, [saved]);

        if (!settings) {
            return <div className="text-gray-500 py-8">Loading...</div>;
        }

        const offset = settings.utcOffsetMinutes || 0;
        const browserOffset = dayjs().utcOffset();
        // An offset the list does not carry is still shown as itself rather
        // than as whichever option happens to come first.
        const offsets = UTC_OFFSETS.includes(offset)
            ? UTC_OFFSETS
            : [...UTC_OFFSETS, offset].sort((a, b) => a - b);

        const changeOffset = async (e) => {
            const previous = settings;
            const utcOffsetMinutes = Number(e.target.value);
            // The shared copy moves first so the select does not snap back
            // while the write is in flight.
            setAppSettings({ ...settings, utcOffsetMinutes });
            setError("");
            setSaved(false);
            setSaving(true);
            try {
                const updated = await pb
                    .collection("appSettings")
                    .update(APP_SETTINGS_ID, { utcOffsetMinutes });
                setAppSettings(updated);
                setSaved(true);
            } catch (err) {
                console.error("Error saving app settings:", err);
                setAppSettings(previous);
                setError(err?.message || "Failed to save the change.");
            } finally {
                setSaving(false);
            }
        };

        return (
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg">Hospital time zone</h2>
                    <SaveStatus saving={saving} saved={saved} />
                </div>
                {!!error && <ErrorBanner className="mb-2">{error}</ErrorBanner>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-100 p-2 rounded-lg">
                    <FormField
                        label="Time zone"
                        name="utcOffsetMinutes"
                        type="select"
                        disabled={!isAdmin || saving}
                        value={offset}
                        onChange={changeOffset}
                    >
                        {offsets.map((minutes) => (
                            <option key={minutes} value={minutes}>
                                {formatUtcOffset(minutes)}
                                {minutes === browserOffset
                                    ? " (this browser)"
                                    : ""}
                            </option>
                        ))}
                    </FormField>
                    <div className="flex flex-col">
                        <span className="text-xs text-left text-gray-700">
                            Today at the hospital
                        </span>
                        <p>
                            {dayjs(hospitalToday(settings)).format(
                                "ddd, DD MMM YYYY",
                            )}
                        </p>
                    </div>
                    <p className="text-sm text-gray-600 md:col-span-2">
                        Every date and time in the app is shown on the
                        hospital&apos;s clock, wherever it is opened from. It
                        also decides which day is today: which OT days and
                        procedures are upcoming, which are past, and
                        patients&apos; ages. This is a fixed offset: if the
                        hospital observes daylight saving, change it when the
                        clocks change.
                    </p>
                    {offset !== browserOffset && (
                        <p className="text-sm text-amber-700 md:col-span-2">
                            This browser is on {formatUtcOffset(browserOffset)},
                            which is not the hospital&apos;s time zone. Times
                            are shown in hospital time, not this browser&apos;s.
                        </p>
                    )}
                </div>
            </div>
        );
    },
};
