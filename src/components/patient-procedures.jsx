import { useState, useEffect } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { pb } from "@/lib/pb";
import { formateDateLong } from "@/utils/dates";
import { ToolBar, ToolBarLink } from "./toolbar";
import ProcedureDetails from "./procedure-details";

const PROC_PAGE_SIZE = 25;

// Everything ProcedureDetails needs to render a procedure read-only. Shared so
// the initial load and any "load more" page stay in step.
const PROCEDURE_EXPAND =
    "procedureDay,procedureDay.otList,addedBy,operatingRoom,procedureCodes_via_procedure.concept,procedureCodes_via_procedure.spinalLevels";

/**
 * PatientProcedures - Read-only, paginated list of a patient's procedures
 *
 * Fetches its own data on mount, so mounting it (e.g. when a patient row is
 * expanded) is all that is needed; unmounting discards the loaded pages.
 *
 * @param {string} patientId - Patient whose procedures to list
 */
function PatientProcedures({ patientId }) {
    const [procedures, setProcedures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadProcedures = async (pageNumber) => {
        if (pageNumber === 1) {
            setProcedures([]);
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const result = await pb
                .collection("procedures")
                .getList(pageNumber, PROC_PAGE_SIZE, {
                    filter: pb.filter("patient = {:patientId}", { patientId }),
                    sort: "-created",
                    expand: PROCEDURE_EXPAND,
                    requestKey: "patient-procedures",
                });

            setProcedures((prev) =>
                pageNumber === 1 ? result.items : [...prev, ...result.items],
            );
            setPage(result.page);
            setTotalPages(result.totalPages);
            setLoading(false);
            setLoadingMore(false);
        } catch (err) {
            // A newer request cancelled this one; it now owns the flags.
            if (err?.isAbort) return;
            console.error("Error fetching procedures:", err);
            if (pageNumber === 1) setProcedures([]);
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProcedures(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    return (
        <div className="pl-8">
            <h3 className="text-sm font-semibold mb-2">Procedures</h3>
            {loading ? (
                <div className="text-sm text-gray-500">
                    Loading procedures...
                </div>
            ) : procedures.length === 0 ? (
                <div className="text-sm text-gray-500">
                    No procedures found for this patient.
                </div>
            ) : (
                <div className="space-y-2">
                    {procedures.map((proc) => (
                        <div
                            key={proc.id}
                            className=" text-sm relative bg-gray-100 rounded-md overflow-clip"
                        >
                            <ToolBar className="col-span-4 bg-gray-200 transition-colors">
                                <div className="px-2 font-medium">
                                    {formateDateLong(
                                        proc?.expand?.procedureDay?.date,
                                    )}{" "}
                                    -{" "}
                                    {
                                        proc?.expand?.procedureDay?.expand
                                            ?.otList?.name
                                    }{" "}
                                    - {proc?.expand?.operatingRoom?.name}
                                </div>
                                <div className="grow"></div>
                                <ToolBarLink
                                    title="Go to procedure"
                                    to={
                                        proc?.removed
                                            ? `/lists/${proc.procedureDay}?procedureId=${proc.id}&scrollTo=${proc.id}&showRemoved=true`
                                            : `/lists/${proc.procedureDay}?procedureId=${proc.id}&scrollTo=${proc.id}`
                                    }
                                >
                                    <ExternalLinkIcon width={16} height={16} />
                                </ToolBarLink>
                            </ToolBar>
                            <ProcedureDetails
                                procedure={proc}
                                readOnly={true}
                            />
                        </div>
                    ))}
                    {page < totalPages && (
                        <button
                            type="button"
                            onClick={() => loadProcedures(page + 1)}
                            disabled={loadingMore}
                            className="text-sm text-blue-600 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingMore
                                ? "Loading..."
                                : `Load more (${page} of ${totalPages})`}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default PatientProcedures;
