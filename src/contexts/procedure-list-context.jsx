import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useState,
} from "react";
import { pb } from "@/lib/pb";

const procedureListReducer = (state, action) => {
    switch (action.type) {
        case "SET_LIST":
            return {
                ...action.payload,
                selected: null,
                updating: [],
                update_failed: [],
            };
        case "SET_SELECTED":
            return {
                ...state,
                selected: action.payload,
            };
        default:
            return state;
    }
};

const ProcedureListContext = createContext(null);

export function ProcedureListProvider({ children }) {
    const [proceduresList, dispathData] = useReducer(
        procedureListReducer,
        null
    );
    const [otDay, setOtDay] = useState(null);
    const [surgeons, setSurgeons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadProcedures = async (procedureDayId) => {
        setLoading(true);
        try {
            if (!!!procedureDayId) {
                return;
            }

            const day = await pb.collection("otDays").getOne(procedureDayId, {
                expand: "otList,otList.operatingRooms,otList.department,otList.department.surgeons_via_department",
            });
            setOtDay(day);
            console.log("otDay", day);

            const gotList = await pb.collection("procedures").getFullList({
                filter: `procedureDay = "${procedureDayId}"`,
                sort: "+order",
                expand: "patient,addedBy,procedureDay.otList,procedureDay",
            });
            dispathData({
                type: "SET_LIST",
                payload: { procedures: gotList },
            });
            console.log("procedures", gotList);
        } catch (e) {
            console.log("Fetch Error: ", e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const isBusy = () => proceduresList?.updating.length > 0; // Busy if any row is being updated

    const isUpdating = (procedure) => {
        proceduresList.updating.includes(procedure.id);
    };

    const setSelected = (procedureId) => {
        dispathData({
            type: "SET_SELECTED",
            payload: procedureId,
        });
    };

    const addProcedure = (procedure) => {
        return "";
    };

    const value = useMemo(() => {
        console.log("state", proceduresList);
        return {
            proceduresList,
            otDay,
            loadProcedures,
            setSelected,
            isUpdating,
            isBusy,
            loading,
            error,
        };
    }, [proceduresList, loading, error]);

    return (
        <ProcedureListContext.Provider value={value}>
            {children}
        </ProcedureListContext.Provider>
    );
}

export function useProcedureList() {
    const ctx = useContext(ProcedureListContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
