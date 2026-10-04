import ProcedureHeaderRow from "./header-row";

/**
 * ProcedureSimplifiedView - Display simplified procedure item in list view
 *
 * The collapsed row: the shared header row and nothing else. Clicking it
 * opens the procedure; clicking the outstanding-items alert opens it at its
 * checklist rather than at the top.
 *
 * @param {Object} procedure - Procedure object with patient and details
 * @param {boolean} isUpdating - Whether the procedure is currently being updated
 * @param {string} className - Additional CSS classes for the container
 * @param {function} onSelected - Callback when clicking to expand the view
 */
function ProcedureSimplifiedView({
    procedure,
    isUpdating,
    className,
    onSelected,
}) {
    return (
        <ProcedureHeaderRow
            procedure={procedure}
            className={[
                "rounded-lg md:rounded-l-none",
                isUpdating ? "animate-pulse" : "",
                className,
            ].join(" ")}
            onClick={() => onSelected(procedure.id)}
            onChecklistAlert={() => onSelected(procedure.id, false, "checklist")}
        />
    );
}

export default ProcedureSimplifiedView;
