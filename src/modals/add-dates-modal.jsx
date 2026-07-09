import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);
import { twMerge } from "tailwind-merge";
import { CalendarPlusIcon } from "lucide-react";

import { api } from "@/lib/api";
import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";
import DaysOfWeekSelector from "@/components/days-of-week-selector";
import { useAuth } from "@/contexts/auth-context";

/**
 * AddDatesModal - Modal for adding single or multiple OT days to a list
 * @param {Function} onCancel - Callback when modal is cancelled
 * @param {Function} onSuccess - Callback when dates are successfully added
 * @param {string} initialOtList - Initial OT list ID to pre-select
 * @param {Array} otLists - Array of available OT lists
 */
export default function AddDatesModal({
    onClose = () => {},
    onSuccess = () => {},
    initialOtList = "",
    otLists = [],
}) {
    const [addDate, setAddDate] = useState("");
    const [addMultiple, setAddMultiple] = useState(false);
    const [selectedDays, setSelectedDays] = useState([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [adding, setAdding] = useState(false);
    const [skippedDates, setSkippedDates] = useState([]);
    const [errorDates, setErrorDates] = useState([]);
    const [createdDates, setCreatedDates] = useState([]);
    const [error, setError] = useState("");
    const [selectedOtList, setSelectedOtList] = useState("");
    const { user } = useAuth();

    useEffect(() => {
        setSelectedOtList(!!initialOtList ? initialOtList : "");
    }, []);

    function getDaysInRange(startDate, endDate, days = []) {
        const dates = [];
        let current = dayjs(startDate);
        const end = dayjs(endDate);

        while (current.isSameOrBefore(end, "day")) {
            const dayOfWeek = current.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            if (days.includes(dayOfWeek)) {
                dates.push(current.format("YYYY-MM-DD"));
            }
            current = current.add(1, "day");
        }

        return dates;
    }

    const listDays = useMemo(
        () => getDaysInRange(fromDate, toDate, selectedDays),
        [fromDate, toDate, selectedDays],
    );

    const handleAddDate = async () => {
        if (!!!selectedOtList) {
            setError("Select a ot list to add dates.");
            return;
        }

        const datesToCreate = !!!addMultiple ? [addDate] : listDays;

        if (datesToCreate.length === 0) {
            setError("Select at least one date.");
            return;
        }

        setAdding(true);
        try {
            const response = await api.bulkCreateOtDays(
                selectedOtList,
                datesToCreate,
            );

            setAdding(false);

            const createdRecords = response.created.map((date) => ({
                ...date,
                expand: {
                    otList:
                        otLists.find(
                            (otList) => otList.id === selectedOtList,
                        ) || null,
                },
            }));

            setCreatedDates(createdRecords);

            if (response.errorCount > 0) {
                console.log(
                    "Some dates could not be added. Errors:",
                    response.errors,
                );
                setError(
                    `Some dates could not be added. ${response.errorCount === 1 ? "An error" : response.errorCount + " errors"} occurred.`,
                );
                setErrorDates(response.errors);
                if (response.skippedCount > 0) {
                    setSkippedDates([...response.skipped]);
                }
            } else {
                if (response.skippedCount > 0) {
                    setSkippedDates(response.skipped);
                    setError(
                        `Some dates were skipped because they already exist in the list.`,
                    );
                } else {
                    setSkippedDates([]);
                    onSuccess(createdRecords);
                }
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setAdding(false);
        }
    };

    const handleClose = () => {
        if (createdDates.length > 0) {
            onSuccess(createdDates);
        }
        onClose();
    };

    return (
        <ModalWindow
            title="Add OT Dates"
            okLabel="Add"
            cancelLabel="Close"
            onOk={handleAddDate}
            onCancel={handleClose}
            icon={<CalendarPlusIcon width={24} height={24} />}
            iconColor="bg-blue-100 text-blue-600"
            okColor="bg-blue-600 hover:bg-blue-500"
            loading={adding}
        >
            <FormField
                label="OT List"
                name="ot_list_name"
                value={selectedOtList}
                onChange={(e) => setSelectedOtList(e.target.value)}
                type="select"
                error={!!!selectedOtList}
            >
                <option value="">Select List</option>
                {otLists.map((otList) => (
                    <option key={otList.id} value={otList.id}>
                        {otList.name}
                    </option>
                ))}
            </FormField>

            <ToolBar className="grid grid-cols-2 mt-2">
                <ToolBarButton
                    title="Add One Date"
                    disabled={false}
                    onClick={() => {
                        setAddMultiple(false);
                        setSkippedDates([]);
                        setError("");
                    }}
                    buttonClassName="flex-grow"
                    className="mr-0 rounded-r-none bg-gray-300"
                    active={!!!addMultiple}
                >
                    <ToolBarButtonLabel className="text-center pr-0">
                        Add One Date
                    </ToolBarButtonLabel>
                </ToolBarButton>
                <ToolBarButton
                    title="Add Multiple Dates"
                    disabled={false}
                    onClick={() => {
                        setAddMultiple(true);
                        setSkippedDates([]);
                        setError("");
                    }}
                    buttonClassName="flex-grow"
                    className="ml-0 rounded-l-none bg-gray-300"
                    active={!!addMultiple}
                >
                    <ToolBarButtonLabel className="text-center pr-0 ">
                        Add Multiple
                    </ToolBarButtonLabel>
                </ToolBarButton>
            </ToolBar>
            <p className="mt-2">
                Add OT dates to the list by entering the date below.
            </p>
            {!!!addMultiple ? (
                <div className="mt-2">
                    <FormField
                        label=""
                        type="date"
                        name="date"
                        value={addDate}
                        onChange={(e) => setAddDate(e.target.value)}
                    />
                    {skippedDates.length > 0 && (
                        <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                            {dayjs(skippedDates[0].date).format(
                                "dddd, DD MMM YYYY ",
                            )}{" "}
                            has already been added.
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <p className="mt-2">From</p>
                    <FormField
                        label=""
                        type="date"
                        name="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                    <p className="mt-2">To</p>
                    <FormField
                        label=""
                        type="date"
                        name="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                    <p className="mt-2">Days of Week</p>
                    <DaysOfWeekSelector
                        value={selectedDays}
                        onChange={setSelectedDays}
                    />

                    <p className="mt-2">Dates To Add</p>
                    <ul className="list-disc h-28 overflow-y-scroll overflow-x-hidden bg-white rounded pl-5 grid grid-cols-2">
                        {listDays.map((date) => (
                            <li
                                className={twMerge(
                                    skippedDates.some((i) => i.date === date) &&
                                        "text-red-500",
                                )}
                                key={date}
                            >
                                {date}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {!!error && (
                <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                    {error}
                </div>
            )}
        </ModalWindow>
    );
}
