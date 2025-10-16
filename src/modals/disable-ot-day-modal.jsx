import dayjs from "dayjs";
import { CalendarCheckIcon, CalendarOffIcon } from "lucide-react";

import { useProcedureList } from "@/contexts/procedure-list-context";
import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";
import { useState } from "react";

function DisableOtDayModal({ onCancel = () => {}, onSuccess = () => {} }) {
    const { otDay, updateOtDay } = useProcedureList();
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState("");
    const [remarks, setRemarks] = useState("");

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
            title={otDay.disabled ? "Enable" : "Disable Day"}
            okLabel={otDay.disabled ? "Enable" : "Disable"}
            onOk={otDay.disabled ? handleEnableOtDay : handleDisableOtDay}
            onCancel={onCancel}
            icon={
                otDay.disabled ? (
                    <CalendarCheckIcon width={24} height={24} />
                ) : (
                    <CalendarOffIcon width={24} height={24} />
                )
            }
            iconColor={
                otDay.disabled
                    ? "bg-blue-100 text-blue-600"
                    : "bg-red-100 text-red-600"
            }
            okColor={
                otDay.disabled
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "bg-red-600 hover:bg-red-500"
            }
            loading={updating}
        >
            <p className="mb-2">
                {otDay.disabled ? "Enable" : "Disable"} the OT Day on{" "}
                {dayjs(otDay.date).format("DD MMM YYYY")}?
            </p>
            {!otDay.disabled && (
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
