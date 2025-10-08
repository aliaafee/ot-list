import {
    createContext,
    useContext,
    useMemo,
    useReducer,
    useState,
} from "react";
import { pb } from "@/lib/pb";
import dayjs from "dayjs";

const procedureListReducer = (state, action) => {
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
        case "UPDATE_ID":
            const procedure = state.procedures.find(
                (p) => p.id === action.payload.id
            );
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
};

const ProcedureListContext = createContext(null);

export function ProcedureListProvider({ children }) {
    const [proceduresList, dispatchData] = useReducer(
        procedureListReducer,
        null
    );
    const [otDay, setOtDay] = useState(null);
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
            dispatchData({
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

    const getProcedureError = (procedure) => {
        return proceduresList.update_failed.find((p) => p.id === procedure.id);
    };

    const setSelected = (procedureId) => {
        dispatchData({
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

        setSelected(placeholderProcedure.id);

        dispatchData({
            type: "ADD_PROCEDURE",
            payload: placeholderProcedure,
        });

        try {
            dispatchData({
                type: "ADD_UPDATING",
                payload: [placeholderProcedure.id],
            });

            const newPatient = await pb.collection("patients").create(patient);

            const newProcedure = await pb
                .collection("procedures")
                .create({ ...procedure, patient: newPatient.id });

            dispatchData({
                type: "UPDATE_ID",
                payload: {
                    id: placeholderProcedure.id,
                    newId: newProcedure.id,
                    newPatientId: newPatient.id,
                },
            });
        } catch (e) {
            console.log(
                "Failed to add procedure",
                JSON.parse(JSON.stringify(e))
            );
            dispatchData({
                type: "ADD_FAILED",
                payload: [
                    {
                        id: placeholderProcedure.id,
                        message: `Failed to add procedure. ${e?.message}`,
                        data: placeholderProcedure,
                        response: e?.response,
                    },
                ],
            });
        } finally {
            dispatchData({
                type: "DONE_UPDATING",
                payload: [placeholderProcedure.id],
            });
        }
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
            getProcedureError,
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
