import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useState,
} from "react";
import { pb } from "@/lib/pb";
import dayjs from "dayjs";

const procedureListReducer = (state, action) => {
    switch (action.type) {
        case "SET_LIST":
            return {
                ...state,
                procedures: action.payload,
                selected: null,
                updating: [],
                update_failed: [],
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
                payload: gotList,
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

    const addProcedure = async (
        procedures,
        otDay,
        operatingRoom,
        procedureData
    ) => {
        const patient = {
            address: "", //procedureData.address,
            dateOfBirth: `${dayjs().year() - procedureData.age}-01-01`, //procedureData.dateOfBirth,
            hospitalId: procedureData.hospitalId,
            name: procedureData.name,
            nid: procedureData.nid,
            phone: procedureData.phone,
            sex: procedureData.sex,
        };

        let nextOrder = 1;
        if (procedures && procedures.length > 0) {
            nextOrder = procedures[procedures.length - 1].order + 1;
        }

        const procedure = {
            addedBy: procedureData.addedBy,
            addedDate: procedureData.addedDate,
            anesthesia: procedureData.anesthesia,
            bed: procedureData.bed,
            comorbids: procedureData.comorbids,
            diagnosis: procedureData.diagnosis,
            duration: procedureData.duration,
            operatingRoom: operatingRoom.id,
            procedure: procedureData.procedure,
            procedureDay: otDay.id,
            remarks: procedureData.remarks,
            removed: procedureData.removed,
            requirements: procedureData.requirements,
            order: nextOrder,
        };

        const tempPatientId = `tempid-${crypto.randomUUID()}`;
        const tempProcedureId = `tempid-${crypto.randomUUID()}`;
        const addedBy =
            otDay.expand.otList.expand.department.expand.surgeons_via_department.find(
                (s) => s.id === procedure.addedBy
            );

        const placeholderProcedure = {
            ...procedure,
            id: tempProcedureId,
            order: nextOrder,
            patient: tempPatientId,
            expand: {
                addedBy: addedBy,
                patient: {
                    ...patient,
                    id: tempPatientId,
                },
                procedureDay: otDay,
            },
        };

        console.log(placeholderProcedure);

        dispathData({
            type: "ADD_PROCEDURE",
            payload: placeholderProcedure,
        });
    };

    const value = useMemo(() => {
        console.log("state", proceduresList);
        return {
            proceduresList,
            otDay,
            loadProcedures,
            addProcedure,
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
