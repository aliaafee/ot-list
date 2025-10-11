import {
    createContext,
    useContext,
    useMemo,
    useReducer,
    useState,
} from "react";
import { pb } from "@/lib/pb";

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
        case "UPDATE_PROCEDURE":
            const originalProcedure = state.procedures.find(
                (p) => p.id === action.payload.id
            );
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
    const [subscribed, setSubscribed] = useState(false);
    const [tempId, setTempId] = useState(1000);

    const proceduresCollectionOptions = {
        sort: "+order",
        expand: "patient,addedBy,procedureDay.otList,procedureDay",
    };

    const getTempId = () => {
        setTempId(tempId + 1);
        return tempId;
    };

    const loadProcedures = async (procedureDayId) => {
        setLoading(true);
        setError("");
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
                ...proceduresCollectionOptions,
                filter: `procedureDay = "${procedureDayId}"`,
            });
            dispatchData({
                type: "SET_LIST",
                payload: gotList,
            });
            console.log("procedures", gotList);
            setLoading(false);
        } catch (e) {
            if (e.isAbort) {
                return;
            }
            console.log("Fetch Error: ", JSON.parse(JSON.stringify(e)));
            setError(e.message);
            setLoading(false);
        }
    };

    const unsubscribeProcedures = () => {
        setSubscribed(false);
        console.log("Unsubscribing to procedures changes...");
        pb.collection("procedures").unsubscribe();
    };

    const subscribeProcedures = (procedureDayId) => {
        setSubscribed(true);

        console.log("Subscribing to procedures changes...", procedureDayId);
        pb.collection("procedures").subscribe(
            "*",
            (e) => {
                console.log(e.action);
                console.log(e.record);
                if (e.action === "update") {
                    dispatchData({
                        type: "UPDATE_PROCEDURE",
                        payload: e.record,
                    });
                    return;
                }
                if (e.action === "create") {
                    dispatchData({
                        type: "ADD_PROCEDURE",
                        payload: e.record,
                    });
                    return;
                }
            },
            {
                ...proceduresCollectionOptions,
                filter: `procedureDay = "${procedureDayId}"`,
            }
        );

        return unsubscribeProcedures;
    };

    const isBusy = () => proceduresList?.updating.length > 0; // Busy if any row is being updated

    const isUpdating = (procedure) => {
        return proceduresList.updating.includes(procedure.id);
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

    const addProcedure = async (patient, procedure, otDay) => {
        const tempPatientId = `tempid-${getTempId()}`;
        const tempProcedureId = `tempid-${getTempId()}`;

        const addedBy =
            otDay.expand.otList.expand.department.expand.surgeons_via_department.find(
                (s) => s.id === procedure.addedBy
            );

        const placeholderProcedure = {
            ...procedure,
            id: tempProcedureId,
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

        dispatchData({
            type: "ADD_PROCEDURE",
            payload: placeholderProcedure,
        });

        setSelected(placeholderProcedure.id);

        const isSubscribed = subscribed;

        try {
            if (isSubscribed) {
                unsubscribeProcedures();
            }

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
            alert("Error on add");
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
                        data: {
                            patient: patient,
                            procedure: procedure,
                        },
                        response: e?.response,
                    },
                ],
            });
        } finally {
            if (isSubscribed) {
                subscribeProcedures(otDay.id);
            }
            dispatchData({
                type: "DONE_UPDATING",
                payload: [placeholderProcedure.id],
            });
        }
    };

    const updateProcedure = async (procedureId, procedureData, otDay) => {
        await updateProcedureAndPatient(
            null,
            {},
            procedureId,
            procedureData,
            otDay
        );
    };

    const updateProcedureAndPatient = async (
        patientId,
        patientData,
        procedureId,
        procedureData,
        otDay
    ) => {
        const original = proceduresList.procedures.find(
            (p) => p.id === procedureId
        );

        const placeholderProcedure = {
            ...original,
            ...procedureData,
            expand: {
                ...original.expand,
                patient: {
                    ...original.expand.patient,
                    ...patientData,
                },
                procedureDay: otDay,
                addedBy:
                    otDay.expand.otList.expand.department.expand.surgeons_via_department.find(
                        (s) => s.id === procedureData.addedBy
                    ),
            },
        };

        dispatchData({
            type: "UPDATE_PROCEDURE",
            payload: placeholderProcedure,
        });

        const isSubscribed = subscribed;

        try {
            if (isSubscribed) {
                unsubscribeProcedures();
            }
            dispatchData({
                type: "ADD_UPDATING",
                payload: [placeholderProcedure.id],
            });

            if (patientId !== null) {
                const updatedPatient = await pb
                    .collection("patients")
                    .update(patientId, patientData);
            }

            const updatedProcedure = await pb
                .collection("procedures")
                .update(procedureId, procedureData, {
                    expand: "patient,addedBy,procedureDay.otList,procedureDay",
                });

            dispatchData({
                type: "UPDATE_PROCEDURE",
                payload: placeholderProcedure,
            });
        } catch (e) {
            console.log(
                "Failed to update procedure",
                JSON.parse(JSON.stringify(e))
            );
            dispatchData({
                type: "ADD_FAILED",
                payload: [
                    {
                        id: placeholderProcedure.id,
                        message: `Failed to update procedure. ${e?.message}`,
                        data: {
                            patientId: patientId,
                            patientData: patientData,
                            procedureId: procedureId,
                            procedureData: procedureData,
                        },
                        response: e?.response,
                    },
                ],
            });
        } finally {
            if (isSubscribed) {
                subscribeProcedures(otDay.id);
            }
            dispatchData({
                type: "DONE_UPDATING",
                payload: [placeholderProcedure.id],
            });
        }
    };

    const value = useMemo(() => {
        // console.log("state", proceduresList);
        return {
            proceduresList,
            otDay,
            loadProcedures,
            subscribeProcedures,
            addProcedure,
            updateProcedure,
            updateProcedureAndPatient,
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
