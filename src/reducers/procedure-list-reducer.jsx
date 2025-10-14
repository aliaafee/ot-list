function ProcedureListReducer(state, action) {
    switch (action.type) {
        case "SET_LIST":
            if (state === null) {
                return {
                    procedures: action.payload,
                    selected: null,
                    updating: [],
                    update_failed: [],
                };
            }
            return {
                ...state,
                procedures: action.payload,
            };
        case "SET_SELECTED":
            return {
                ...state,
                selected: action.payload,
            };
        case "ADD_PROCEDURE":
            return {
                ...state,
                procedures: [...state.procedures, action.payload],
            };
        case "REMOVE_PROCEDURE":
            return {
                ...state,
                procedures: state.procedures.filter(
                    (item) => item.id !== action.payload.id
                ),
            };
        case "UPDATE_ID":
            const procedure = state.procedures.find(
                (p) => p.id === action.payload.id
            );
            if (procedure === undefined) {
                return state;
            }
            return {
                ...state,
                procedures: [
                    ...state.procedures.filter(
                        (p) => p.id !== action.payload.id
                    ),
                    {
                        ...procedure,
                        id: action.payload.newId,
                        patient: action.payload.newPatientId,
                        expand: {
                            ...procedure.expand,
                            patient: {
                                ...procedure.expand.patient,
                                id: action.payload.newPatientId,
                            },
                        },
                    },
                ],
                selected:
                    state.selected === action.payload.id
                        ? action.payload.newId
                        : state.selected,
            };
        case "UPDATE_PROCEDURE":
            const originalProcedure = state.procedures.find(
                (p) => p.id === action.payload.id
            );
            if (originalProcedure === undefined) {
                return state;
            }
            return {
                ...state,
                procedures: [
                    ...state.procedures.filter(
                        (p) => p.id !== action.payload.id
                    ),
                    {
                        ...originalProcedure,
                        ...action.payload,
                    },
                ],
            };

        case "ADD_UPDATING":
            return {
                ...state,
                updating: [...state.updating, ...action.payload],
            };
        case "DONE_UPDATING":
            return {
                ...state,
                updating: state.updating.filter(
                    (item) => !!!action.payload.includes(item)
                ),
            };
        case "ADD_FAILED":
            return {
                ...state,
                update_failed: [...state.update_failed, ...action.payload],
            };
        default:
            return state;
    }
}

export default ProcedureListReducer;
