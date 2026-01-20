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
import ErrorModal from "@/modals/error-modal";
import { ToastContainer } from "@/components/toast";
import { useSearchParams } from "react-router";
import { useAuth } from "./auth-context";

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
    const [updateError, setUpdateError] = useState(null);
    const [error, setError] = useState("");
    const [subscribed, setSubscribed] = useState(false);
    const [tempId, setTempId] = useState(1000);
    const [toasts, setToasts] = useState([]);
    const { user } = useAuth();

    const [searchParams, setSearchParams] = useSearchParams();

    const showToast = (message, type = "success", duration = 3000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const getTempId = () => {
        setTempId(tempId + 1);
        return tempId;
    };

    const getProcedures = async (procedureDayId, operatingRoomId) => {
        return await pb.collection("procedures").getFullList({
            ...proceduresCollectionOptions,
            filter: pb.filter(
                "procedureDay = {:procedureDayId} && operatingRoom = {:operatingRoomId}",
                {
                    procedureDayId: procedureDayId,
                    operatingRoomId: operatingRoomId,
                }
            ),
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
                filter: pb.filter("procedureDay = {:procedureDayId}", {
                    procedureDayId: procedureDayId,
                }),
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

    const reloadProcedure = async (procedureId) => {
        try {
            const procedure = await pb
                .collection("procedures")
                .getOne(procedureId, proceduresCollectionOptions);
            dispatchData({
                type: "UPDATE_PROCEDURE",
                payload: procedure,
            });
        } catch (e) {
            console.log("Fetch Error: ", JSON.parse(JSON.stringify(e)));
            setError(e);
        }
    };

    const createUnsubscribeProcedures = (procedureDayId) => {
        return () => {
            setSubscribed(false);

            pb.collection("procedures").unsubscribe();
            pb.collection("otDays").unsubscribe(procedureDayId);
            pb.collection("patients").unsubscribe();
        };
    };

    const subscribeProcedures = (procedureDayId) => {
        if (procedureDayId === undefined || !procedureDayId) {
            return () => {};
        }

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

        pb.collection("patients").subscribe(
            "*",
            (e) => {
                console.log("Patient event:", e.action, e.record);
                if (e.action === "update") {
                    // Update all procedures with this patient
                    dispatchData({
                        type: "UPDATE_PATIENT_IN_PROCEDURES",
                        payload: e.record,
                    });
                }
            },
            { expand: "procedures_via_patient" }
        );

        return createUnsubscribeProcedures(procedureDayId);
    };

    const isBusy = () => proceduresList?.updating.length > 0; // Busy if any row is being updated

    const isUpdating = (procedure) => {
        return proceduresList.updating.includes(procedure.id);
    };

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

    const setSelected = (procedureId, scrollTo = false) => {
        const showRemoved = searchParams.get("showRemoved") === "true";

        const params = new URLSearchParams();
        if (procedureId !== null) {
            params.set("procedureId", procedureId);
            if (scrollTo) {
                params.set("scrollTo", procedureId);
            }
        }
        if (showRemoved) {
            params.set("showRemoved", "true");
        }
        setSearchParams(params);
    };

    const addProcedure = async (patient, procedure, otDay) => {
        try {
            const newPatient = patient?.id
                ? patient
                : await pb.collection("patients").create({
                      ...patient,
                      creator: user.id,
                      updater: user.id,
                  });

            const newProcedure = await pb.collection("procedures").create(
                {
                    ...procedure,
                    patient: newPatient.id,
                    creator: user.id,
                    updater: user.id,
                },
                { ...proceduresCollectionOptions }
            );

            dispatchData({
                type: "ADD_PROCEDURE",
                payload: newProcedure,
            });
            setSelected(newProcedure.id, true);

            // Show success toast
            showToast("Procedure added successfully", "success");
        } catch (e) {
            console.log(
                "Failed to add procedure",
                JSON.parse(JSON.stringify(e))
            );

            // Show error toast
            showToast("Failed to add procedure", "error");

            return {
                message: `Failed to add procedure`,
                error: e,
                data: { patient: patient, procedure: procedure },
                response: e?.response,
            };
        }
    };

    const updateProcedures = async (
        newProcedures,
        updatedOtDay = otDay,
        revertOnFail = true
    ) => {
        newProcedures.forEach((p) => discardProcedureUpdate(p.id));

        // Store original procedures for rollback
        const originalProcedures = [];
        const removedProcedures = [];

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

                discardProcedureUpdate(newProcedure.id);

                // Store original for rollback
                originalProcedures.push(original);

                return {
                    ...original,
                    ...newProcedure,
                    procedureDay: !!updatedOtDay ? updatedOtDay.id : otDay.id,
                    expand: {
                        ...original.expand,
                        procedureDay: !!updatedOtDay ? updatedOtDay : otDay,
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

        const proceduresToRemove = newProcedures.filter(
            (
                newProcedure // Find the procedures in this list whose day has been changed
            ) =>
                proceduresList.procedures.some(
                    (p) => newProcedure.id === p.id
                ) &&
                (newProcedure?.procedureDay !== undefined
                    ? newProcedure?.procedureDate !== otDay.id
                    : false)
        );

        proceduresToRemove.forEach((newProcedure) => {
            // Store removed procedures for rollback
            const original = proceduresList.procedures.find(
                (p) => p.id === newProcedure.id
            );
            if (original) {
                removedProcedures.push(original);
            }

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
                const { id: procedureId, ...changes } = newProcedure;
                const updatedProcedure = await pb
                    .collection("procedures")
                    .update(
                        procedureId,
                        { ...changes, updater: user.id },
                        {
                            ...proceduresCollectionOptions,
                        }
                    );

                // if (!subscribed) {
                if (updatedProcedure.procedureDay === otDay.id) {
                    // Only update the procedures in this otDay
                    dispatchData({
                        type: "UPDATE_PROCEDURE",
                        payload: updatedProcedure,
                    });
                }
                // }
            }

            // Show success toast for procedure updates
            if (newProcedures.length === 1) {
                showToast("Procedure updated successfully", "success");
            } else {
                showToast(
                    `${newProcedures.length} procedures updated successfully`,
                    "success"
                );
            }
        } catch (e) {
            if (revertOnFail) {
                console.log(
                    "Failed to update procedures, reverting changes",
                    JSON.parse(JSON.stringify(e))
                );

                // Revert all changes
                originalProcedures.forEach((original) => {
                    dispatchData({
                        type: "UPDATE_PROCEDURE",
                        payload: original,
                    });
                });

                // Restore removed procedures
                removedProcedures.forEach((procedure) => {
                    dispatchData({
                        type: "ADD_PROCEDURE",
                        payload: procedure,
                    });
                });

                setUpdateError({
                    message: `Failed to update procedures. All changes have been reverted.`,
                    data: e,
                });

                // Show error toast
                showToast(
                    "Failed to update procedures. Changes reverted.",
                    "error"
                );

                throw e;
            } else {
                console.log(
                    "Failed to update procedures",
                    JSON.parse(JSON.stringify(e))
                );
                dispatchData({
                    type: "ADD_FAILED",
                    payload: newProcedures.map((p) => ({
                        id: p.id,
                        type: "update",
                        message: `Failed to update procedure. ${e?.message} ${e?.originalError?.message}`,
                        original: originalProcedures.find(
                            (op) => op.id === p.id
                        ),
                        data: {
                            patientId: p.patient,
                            patientData: {}, // Not updating patient here
                            procedureId: p.id,
                            procedureData: p,
                        },
                        response: e?.response,
                        error: e,
                    })),
                });

                // Show error toast
                showToast("Failed to update procedure", "error");

                throw e;
            }
        } finally {
            dispatchData({
                type: "DONE_UPDATING",
                payload: newProcedures.map((p) => p.id),
            });
        }
    };

    const updateOtDay = async (newOtDay) => {
        try {
            const { id: otDayId, ...changes } = newOtDay;
            const updateOtDay = await pb
                .collection("otDays")
                .update(
                    otDayId,
                    { ...changes, updater: user.id },
                    { ...otDayCollectionOptions }
                );
            if (!subscribed) {
                setOtDay(updateOtDay);
            }
            showToast("OT Day updated successfully", "success");
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
            updateOtDay,
            setSelected,
            isUpdating,
            isBusy,
            getProcedureError,
            discardProcedureUpdate,
            reloadProcedure,
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

    return (
        <ProcedureListContext.Provider value={value}>
            {children}
            {!!updateError && (
                <ErrorModal
                    message={updateError.message}
                    data={updateError.data}
                    onClose={() => setUpdateError(null)}
                />
            )}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ProcedureListContext.Provider>
    );
}

export function useProcedureList() {
    const ctx = useContext(ProcedureListContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
