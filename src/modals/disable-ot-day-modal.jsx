import dayjs from "dayjs";
import { CalendarCheckIcon, CalendarOffIcon } from "lucide-react";

import { useProcedureList } from "@/contexts/procedure-list-context";
import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";
import { useEffect, useState } from "react";

/**
 * DisableOtDayModal - Modal for disabling/enabling an OT day with remarks
 * @param {Function} onCancel - Callback when modal is cancelled
 * @param {Function} onSuccess - Callback when OT day is successfully updated
 */
function DisableOtDayModal({ onCancel = () => {}, onSuccess = () => {} }) {
    const { otDay, updateOtDay } = useProcedureList();
    const [displayedOtDay, setDisplayedOtDay] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState("");
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        setDisplayedOtDay(otDay);
    }, []);

    const handleDisableOtDay = async () => {
        try {
            setUpdating(true);
            setError("");
            await updateOtDay({
                id: otDay.id,
                remarks: remarks,
                disabled: true,
            });
            onSuccess();
        } catch (e) {
            setError(`Failed to update otDay. ${e.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const handleEnableOtDay = async () => {
        try {
            setUpdating(true);
            setError("");
            await updateOtDay({
                id: otDay.id,
                remarks: "",
                disabled: false,
            });
            onSuccess();
        } catch (e) {
            setError(`Failed to update otDay. ${e.message}`);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <ModalWindow
            title={displayedOtDay?.disabled ? "Enable" : "Disable Day"}
            okLabel={displayedOtDay?.disabled ? "Enable" : "Disable"}
            onOk={
                displayedOtDay?.disabled
                    ? handleEnableOtDay
                    : handleDisableOtDay
            }
            onCancel={onCancel}
            icon={
                displayedOtDay?.disabled ? (
                    <CalendarCheckIcon width={24} height={24} />
                ) : (
                    <CalendarOffIcon width={24} height={24} />
                )
            }
            iconColor={
                displayedOtDay?.disabled
                    ? "bg-blue-100 text-blue-600"
                    : "bg-red-100 text-red-600"
            }
            okColor={
                displayedOtDay?.disabled
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "bg-red-600 hover:bg-red-500"
            }
            loading={updating}
        >
            <p className="mb-2">
                {displayedOtDay?.disabled ? "Enable" : "Disable"} the OT Day on{" "}
                {dayjs(displayedOtDay?.date).format("DD MMM YYYY")}?
            </p>
            {!displayedOtDay?.disabled && (
                <form>
                    <FormField
                        label="Remarks"
                        name="remarks"
                        value={remarks}
                        onChange={(e) => {
                            setRemarks(e.target.value);
                        }}
                        type="textarea"
                        className="w-full"
                    />
                </form>
            )}
            {!!error && (
                <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                    Failed to update OT Day. {error}
                </div>
            )}
        </ModalWindow>
    );
}

export default DisableOtDayModal;
