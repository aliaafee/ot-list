import {
    createContext,
    useContext,
    useMemo,
    useReducer,
    useState,
} from "react";
import { pb } from "@/lib/pb";
import ProcedureListReducer from "@/reducers/procedure-list-reducer";
import FatalErrorModal from "@/modals/fatal-error-modal";

const ProcedureListContext = createContext(null);

const proceduresCollectionOptions = {
    sort: "+order",
    expand: "patient,addedBy,procedureDay.otList,procedureDay",
};

const otDayCollectionOptions = {
    expand: "otList,otList.operatingRooms,otList.department,otList.department.activeSurgeons_via_department,otList.department.surgeons_via_department,otList.upcomingOtDays_via_otList",
};

export function ProcedureListProvider({ children }) {
    const [proceduresList, dispatchData] = useReducer(
        ProcedureListReducer,
        null
    );
    const [otDay, setOtDay] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [subscribed, setSubscribed] = useState(false);
    const [tempId, setTempId] = useState(1000);

    const getTempId = () => {
        setTempId(tempId + 1);
        return tempId;
    };

    const getProcedures = async (procedureDayId, operatingRoomId) => {
        return await pb.collection("procedures").getFullList({
            ...proceduresCollectionOptions,
            filter: `procedureDay = "${procedureDayId}" && operatingRoom = "${operatingRoomId}"`,
            sort: "order",
        });
    };

    const loadProcedures = async (procedureDayId) => {
        setLoading(true);
        setError("");

        dispatchData({
            type: "SET_LIST",
            payload: [],
        });
        setOtDay(null);

        try {
            if (procedureDayId === undefined || !procedureDayId) {
                setLoading(false);

                return;
            }

            const day = await pb.collection("otDays").getOne(procedureDayId, {
                ...otDayCollectionOptions,
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
            setError(e);
            setLoading(false);
        }
    };

    const createUnsubscribeProcedures = (procedureDayId) => {
        return () => {
            setSubscribed(false);

            pb.collection("procedures").unsubscribe();
            pb.collection("otDays").unsubscribe(procedureDayId);
        };
    };

    const subscribeProcedures = (procedureDayId) => {
        setSubscribed(true);

        pb.collection("procedures").subscribe(
            "*",
            (e) => {
                console.log(e.action);
                console.log(e.record);
                if (e.action === "update") {
                    if (procedureDayId === e.record.procedureDay) {
                        dispatchData({
                            type: "UPDATE_PROCEDURE",
                            payload: e.record,
                        });
                        return;
                    }
                    dispatchData({
                        type: "REMOVE_PROCEDURE",
                        payload: e.record,
                    });
                    return;
                }
                if (e.action === "create") {
                    if (procedureDayId === e.record.procedureDay) {
                        dispatchData({
                            type: "ADD_PROCEDURE",
                            payload: e.record,
                        });
                    }
                }
            },
            {
                ...proceduresCollectionOptions,
                // filter: `procedureDay = "${procedureDayId}"`,
            }
        );

        pb.collection("otDays").subscribe(
            procedureDayId,
            (e) => {
                if (e.action === "update") {
                    setOtDay(e.record);
                }
            },
            {
                ...otDayCollectionOptions,
            }
        );

        return createUnsubscribeProcedures(procedureDayId);
    };

    const isBusy = () => proceduresList?.updating.length > 0; // Busy if any row is being updated

    const isUpdating = (procedure) => {
        return proceduresList.updating.includes(procedure.id);
    };

    // const getUpdateError = (procedure) => {
    //     return proceduresList.update_failed.some((p) => p.id === procedure.id);
    // };

    const getProcedureError = (procedure) => {
        return proceduresList.update_failed.find((p) => p.id === procedure.id);
    };

    const discardProcedureUpdate = (procedureId) => {
        if (!proceduresList.update_failed.some((p) => p.id === procedureId)) {
            return;
        }
        console.log("Discarding procedure update for ", procedureId);
        dispatchData({
            type: "UPDATE_PROCEDURE",
            payload: proceduresList.update_failed.find(
                (p) => p.id === procedureId
            ).original,
        });

        dispatchData({
            type: "CLEAR_FAILED",
            payload: [procedureId],
        });
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

        try {
            dispatchData({
                type: "ADD_UPDATING",
                payload: [placeholderProcedure.id],
            });

            const newPatient = await pb.collection("patients").create(patient);

            const newProcedure = await pb
                .collection("procedures")
                .create({ ...procedure, patient: newPatient.id });

            if (subscribed) {
                dispatchData({
                    type: "REMOVE_PROCEDURE",
                    payload: placeholderProcedure,
                });
                setSelected(newProcedure.id);
            } else {
                dispatchData({
                    type: "UPDATE_ID",
                    payload: {
                        id: placeholderProcedure.id,
                        newId: newProcedure.id,
                        newPatientId: newPatient.id,
                    },
                });
            }
        } catch (e) {
            dispatchData({
                type: "ADD_FAILED",
                payload: [
                    {
                        id: placeholderProcedure.id,
                        type: "create",
                        message: `Failed to add procedure. ${e?.message} ${e?.originalError?.message}`,
                        data: {
                            patient: patient,
                            procedure: procedure,
                        },
                        response: e?.response,
                        error: e,
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

    const updateProcedures = async (newProcedures, updatedOtDay = otDay) => {
        newProcedures.forEach((p) => discardProcedureUpdate(p.id));

        newProcedures
            .filter(
                (
                    newProcedure // Skip making placeholders for procedures not in this otDay
                ) =>
                    newProcedure?.procedureDay !== undefined
                        ? newProcedure?.procedureDate === otDay.id
                        : true
            )
            .map((newProcedure) => {
                // Make the placeholders
                const original =
                    getProcedureError({ id: newProcedure.id })?.original ||
                    proceduresList.procedures.find(
                        (p) => p.id === newProcedure.id
                    );

                discardProcedureUpdate(procedureId);

                return {
                    ...original,
                    ...newProcedure,
                    procedureDay: updatedOtDay.id,
                    expand: {
                        ...original.expand,
                        procedureDay: updatedOtDay,
                    },
                    original: original,
                };
            })
            .forEach(
                (
                    newProcedure // Push to the reducer
                ) =>
                    dispatchData({
                        type: "UPDATE_PROCEDURE",
                        payload: newProcedure,
                    })
            );

        newProcedures
            .filter(
                (
                    newProcedure // Find the procedures in this list whose day has been changed
                ) =>
                    proceduresList.procedures.some(
                        (p) => newProcedure.id === p.id
                    ) &&
                    (newProcedure?.procedureDay !== undefined
                        ? newProcedure?.procedureDate !== otDay.id
                        : false)
            )
            .forEach((newProcedure) => {
                // Remove those placeholders from this list
                dispatchData({
                    type: "REMOVE_PROCEDURE",
                    payload: newProcedure,
                });
            });

        try {
            dispatchData({
                type: "ADD_UPDATING",
                payload: newProcedures.map((p) => p.id),
            });

            for (const newProcedure of newProcedures) {
                try {
                    const { id: procedureId, ...changes } = newProcedure;
                    const updatedProcedure = await pb
                        .collection("procedures")
                        .update(procedureId, changes, {
                            ...proceduresCollectionOptions,
                        });

                    if (!subscribed) {
                        if (updatedProcedure.procedureDay === otDay.id) {
                            // Only update the procedures in this otDay
                            dispatchData({
                                type: "UPDATE_PROCEDURE",
                                payload: updatedProcedure,
                            });
                        }
                    }
                } catch (e) {
                    dispatchData({
                        type: "ADD_FAILED",
                        payload: [
                            {
                                id: newProcedure.id,
                                type: "update",
                                message: `Failed to update procedure (i). ${e?.message} ${e?.originalError?.message}`,
                                original: newProcedure.original,
                                data: newProcedure,
                                response: e?.response,
                                error: e,
                            },
                        ],
                    });
                }
            }
        } catch (e) {
            dispatchData({
                type: "ADD_FAILED",
                payload: newProcedures.map((p) => ({
                    id: p.id,
                    type: "update",
                    message: `Failed to update procedure. ${e?.message} ${e?.originalError?.message}`,
                    original: p.original,
                    data: p,
                    response: e?.response,
                    error: e,
                })),
            });
        } finally {
            dispatchData({
                type: "DONE_UPDATING",
                payload: newProcedures.map((p) => p.id),
            });
        }
    };

    const updateProcedureAndPatient = async (
        patientId,
        patientData,
        procedureId,
        procedureData,
        otDay
    ) => {
        const original =
            getProcedureError({ id: procedureId })?.original ||
            proceduresList.procedures.find((p) => p.id === procedureId);

        discardProcedureUpdate(procedureId);

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

        try {
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

            if (!subscribed) {
                dispatchData({
                    type: "UPDATE_PROCEDURE",
                    payload: updatedProcedure,
                });
            }
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
                        type: "update",
                        message: `Failed to update procedure. ${e?.message} ${e?.originalError?.message}`,
                        original: original,
                        data: {
                            patientId: patientId,
                            patientData: patientData,
                            procedureId: procedureId,
                            procedureData: procedureData,
                        },
                        response: e?.response,
                        error: e,
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

    const updateOtDay = async (newOtDay) => {
        try {
            const { id: otDayId, ...changes } = newOtDay;
            const updateOtDay = await pb
                .collection("otDays")
                .update(otDayId, changes, { ...otDayCollectionOptions });
            if (!subscribed) {
                setOtDay(updateOtDay);
            }
        } catch (e) {
            console.log("Update otDay Error: ", JSON.parse(JSON.stringify(e)));
            throw e;
        }
    };

    const value = useMemo(() => {
        // console.log("state", proceduresList);
        return {
            proceduresList,
            otDay,
            loadProcedures,
            getProcedures,
            subscribeProcedures,
            addProcedure,
            updateProcedures,
            updateProcedureAndPatient,
            updateOtDay,
            setSelected,
            isUpdating,
            isBusy,
            getProcedureError,
            discardProcedureUpdate,
            loading,
            error,
        };
    }, [proceduresList, loading, error, otDay]);

    if (!!error) {
        return (
            <FatalErrorModal
                message={`Error while loading procedures. ${error.message} Please reload page.`}
                data={error}
            />
        );
    }

    // if (proceduresList?.update_failed.length > 0) {
    //     return (
    //         <FatalErrorModal
    //             message={`Error while adding/updating procedures. Please reload page.`}
    //             data={proceduresList?.update_failed}
    //         />
    //     );
    // }

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
