import React, { useContext, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);
import { twMerge } from "tailwind-merge";
import { CalendarPlusIcon } from "lucide-react";

import { pb } from "@/lib/pb";
import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";
import DaysOfWeekSelector from "@/components/days-of-week-selector";

export default function AddDatesModal({
    onCancel = () => {},
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
    const [duplicateDates, setDuplicateDates] = useState([]);
    const [error, setError] = useState("");
    const [selectedOtList, setSelectedOtList] = useState("");

    useEffect(() => {
        setSelectedOtList(initialOtList);
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
        [fromDate, toDate, selectedDays]
    );

    const handleAddDate = async () => {
        if (!!!selectedOtList) {
            setError("Select a ot list to add dates.");
            return;
        }

        const dateItems = !!!addMultiple
            ? [
                  {
                      date: addDate,
                      otList: selectedOtList,
                      remarks: "",
                      disabled: false,
                  },
              ]
            : listDays.map((day) => ({
                  date: day,
                  otList: selectedOtList,
                  remarks: "",
                  disabled: false,
              }));

        if (dateItems.length === 0) {
            setError("Select at least one date.");
            return;
        }

        setAdding(true);
        try {
            for (const item of dateItems) {
                const record = await pb.collection("otDays").create(item);
            }

            setAdding(false);
            onSuccess();
        } catch (e) {
            if (e?.data?.data?.date?.code === "validation_not_unique") {
                setError("Seleted date already present.");
            } else {
                setError(e.message);
            }
            setAdding(false);
        }
    };

    return (
        <ModalWindow
            title="Add OT Dates"
            okLabel="Add"
            onOk={handleAddDate}
            onCancel={onCancel}
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
                        setDuplicateDates([]);
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
                        setDuplicateDates([]);
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
                    {duplicateDates.length > 0 && (
                        <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                            {dayjs(duplicateDates[0].date).format(
                                "dddd, DD MMM YYYY "
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
                                    duplicateDates.some(
                                        (i) => i.date === date
                                    ) && "text-red-500"
                                )}
                                key={date}
                            >
                                {date}
                            </li>
                        ))}
                    </ul>

                    {!!duplicateDates.length > 0 && (
                        <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                            Some dates have already been added.
                        </div>
                    )}
                </div>
            )}
            {!!error && (
                <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                    An error occured. {error}
                </div>
            )}
        </ModalWindow>
    );
}
