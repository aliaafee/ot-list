import { CheckIcon, LoaderCircleIcon } from "lucide-react";

/**
 * SaveStatus - "Saving..." while writes are in flight, then "Saved" for as
 * long as the caller keeps `saved` set. Nothing otherwise.
 *
 * @param {boolean} saving - Whether a write is in flight
 * @param {boolean} saved - Whether the last write landed
 */
export default function SaveStatus({ saving, saved }) {
    if (saving) {
        return (
            <span className="flex items-center gap-1 text-xs text-gray-500">
                <LoaderCircleIcon size={14} className="animate-spin" />
                Saving...
            </span>
        );
    }
    if (saved) {
        return (
            <span className="flex items-center gap-1 text-xs text-green-700">
                <CheckIcon size={14} />
                Saved
            </span>
        );
    }
    return null;
}
