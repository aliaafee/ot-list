import { insertDayInOrder } from "@/utils/ot-days";

function OtDaysReducer(state, action) {
    switch (action.type) {
        case "SET_LIST":
            // Replace the entire OT days list
            return {
                ...state,
                otDays: action.payload, // payload: array of OT days
            };

        case "ADD_DAY": {
            // Add a new OT day to the list, ignoring duplicates
            if (state.otDays.some((day) => day.id === action.payload.id)) {
                return state;
            }
            // The list is kept in date order, so slot the day into place
            // instead of appending it. payload: new OT day object
            return {
                ...state,
                otDays: insertDayInOrder(state.otDays, action.payload),
            };
        }

        case "REMOVE_DAY":
            // Drop an OT day from the list by ID
            return {
                ...state,
                otDays: state.otDays.filter(
                    (day) => day.id !== action.payload.id,
                ),
            };

        case "UPDATE_DAY":
            // Update an existing OT day by ID
            return {
                ...state,
                otDays: state.otDays.map((day) =>
                    day.id === action.payload.id
                        ? { ...day, ...action.payload }
                        : day,
                ),
            };

        case "ADD_DAYS":
            // Add multiple OT days to the list (for pagination)
            return {
                ...state,
                otDays: [...state.otDays, ...action.payload], // payload: array of OT days
            };

        default:
            return state;
    }
}

export default OtDaysReducer;
