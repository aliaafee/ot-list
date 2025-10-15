import dayjs from "dayjs";
import { CalendarOffIcon } from "lucide-react";

import { useProcedureList } from "@/contexts/procedure-list-context";
import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";
import { useState } from "react";

function DisableOtDayModal({ onCancel = () => {}, onSuccess = () => {} }) {
    const {
        otDay,
        updateProcedures,
        proceduresList,
        setSelected,
        getProcedures,
    } = useProcedureList();
    const [disabling, setDisabling] = useState(false);
    const [error, setError] = useState("");
    const [remarks, setRemarks] = useState("");

    const handleDisableOtDay = async () => {
        setDisabling(true);
        setError("");
        console.log("disable ot days", remarks);
        setDisabling(false);
    };

    return (
        <ModalWindow
            title="Disable Day"
            okLabel="Disable"
            onOk={handleDisableOtDay}
            onCancel={onCancel}
            icon={<CalendarOffIcon width={24} height={24} />}
            loading={disabling}
        >
            <p className="mb-2">
                Disable the OT Day on {dayjs(otDay.date).format("DD MMM YYYY")}?
            </p>
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
            {!!error && (
                <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                    Failed to disable OT Day. {error}
                </div>
            )}
        </ModalWindow>
    );
}

export default DisableOtDayModal;
