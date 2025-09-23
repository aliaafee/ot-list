const DaysOfWeekSelector = ({ value = [], onChange }) => {
    // Sunday = 0, Monday = 1, ..., Saturday = 6
    const days = [
        { label: "Sunday", value: 0 },
        { label: "Monday", value: 1 },
        { label: "Tuesday", value: 2 },
        { label: "Wednesday", value: 3 },
        { label: "Thursday", value: 4 },
        // { label: "Friday", value: 5 },
        { label: "Saturday", value: 6 },
    ];

    const toggleDay = (dayValue) => {
        let updatedDays;
        if (value.includes(dayValue)) {
            updatedDays = value.filter((d) => d !== dayValue);
        } else {
            updatedDays = [...value, dayValue];
        }
        if (onChange) {
            onChange(updatedDays);
        }
    };

    return (
        <div className="grid grid-cols-3 gap-2 w-full rounded p-1 bg-white">
            {days.map((day) => (
                <label
                    key={day.value}
                    className="flex items-center gap-2 overflow-hidden"
                >
                    <input
                        type="checkbox"
                        checked={value.includes(day.value)}
                        onChange={() => toggleDay(day.value)}
                    />
                    <span className="overflow-ellipsis">{day.label}</span>
                </label>
            ))}
        </div>
    );
};

export default DaysOfWeekSelector;
