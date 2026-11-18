import { Link } from "react-router";
import { twMerge } from "tailwind-merge";
import { ExternalLinkIcon } from "lucide-react";

import { useProcedureList } from "@/contexts/procedure-list-context";
import {
    describeProcedureCodes,
    describeProcedureCodesSimplified,
} from "@/lib/procedure-codes";
import { OtListColours } from "@/utils/colours";
import {
    age,
    calendarDate,
    formateDateLong,
    hospitalTime,
} from "@/utils/dates";
import Collapsible from "./collapsible";
import ErrorBanner from "./error-banner";
import LabelListValue from "./label-list-value";
import LabelValue from "./label-value";
import { PacStatusSmall } from "./pac-status";
import ProcedureChecklist from "./procedure-item/checklist";
import ProcedureComments from "./procedure-item/comments";

/**
 * One band of the view. With `collapsible`, the title is the toggle and the
 * band starts closed, as every section below the header does.
 */
function Section({ title, children, className, collapsible = false }) {
    if (collapsible) {
        return (
            <Collapsible
                className={twMerge("p-3 border-b border-gray-200", className)}
                summaryClassName="text-sm font-semibold"
                contentClassName="mt-2"
                summary={title}
            >
                {children}
            </Collapsible>
        );
    }

    return (
        <section className={twMerge("p-3 border-b border-gray-200", className)}>
            {title && (
                <h2 className="uppercase font-medium text-gray-500 text-xs mb-2">
                    {title}
                </h2>
            )}
            {children}
        </section>
    );
}

/**
 * OtProcedureView - One procedure in full, for the body of the OT workspace
 *
 * The procedure is read from the procedure list context, which the workspace
 * page loads for the route's OT day: a case's link always carries its own
 * day, so the selected procedure is in that list, and it stays live through
 * the context's subscriptions.
 *
 * Read-only for the procedure itself; editing stays on the Lists page for
 * now. The checklist and comments are their own write paths and work here
 * as anywhere, with their role checks. Every section below the header starts
 * collapsed.
 *
 * @param {string} [otDayId] - The route's OT day
 * @param {string} [procedureId] - The procedure to show
 * @param {string} [className] - Additional CSS classes for the container
 */
function OtProcedureView({ otDayId, procedureId, className }) {
    const { otDay, proceduresList, loading } = useProcedureList();

    const dayLoaded = !loading && otDay?.id === otDayId;
    const procedure = dayLoaded
        ? proceduresList?.procedures?.find((p) => p.id === procedureId)
        : null;

    if (!procedureId) {
        return (
            <div
                className={twMerge(
                    "p-6 text-sm text-gray-500 text-center",
                    className,
                )}
            >
                Select a case from the list.
            </div>
        );
    }

    if (!dayLoaded) {
        return (
            <div className={twMerge("animate-pulse p-3 space-y-3", className)}>
                <div className="h-7 bg-gray-100 rounded w-72" />
                <div className="h-4 bg-gray-100 rounded w-96" />
                <div className="h-24 bg-gray-100 rounded" />
                <div className="h-24 bg-gray-100 rounded" />
            </div>
        );
    }

    if (!procedure) {
        return (
            <div className={twMerge("p-3", className)}>
                <ErrorBanner>
                    This case is not on this list. It may have been moved or
                    deleted.
                </ErrorBanner>
            </div>
        );
    }

    const patient = procedure.expand?.patient;
    const otList = otDay.expand?.otList;
    const room = otList?.expand?.operatingRooms?.find(
        (r) => r.id === procedure.operatingRoom,
    );
    const procedureCodes = describeProcedureCodes(procedure);
    const procedureName =
        describeProcedureCodesSimplified(procedure).join(" + ");

    return (
        // Keyed on the case so each one opens with every section collapsed,
        // rather than keeping what was open on the case before.
        <div key={procedure.id} className={twMerge("flex flex-col", className)}>
            <Section>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h1 className="text-xl font-medium">
                        {patient?.name || "-"}
                    </h1>
                    <span className="text-gray-600">{patient?.nid}</span>
                    <span className="text-gray-600">
                        {patient?.dateOfBirth ? age(patient.dateOfBirth) : "-"}{" "}
                        / {patient?.sex?.[0]?.toUpperCase() || "-"}
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-600">
                    <span
                        className={twMerge(
                            "rounded-sm px-1.5 py-0.5 text-xs text-white bg-gray-500",
                            OtListColours[otList?.colour],
                        )}
                    >
                        {otList?.name}
                    </span>
                    <span>{formateDateLong(otDay.date)}</span>
                    {room && <span>· {room.name}</span>}
                    {!procedure.removed && <span>· #{procedure.order}</span>}
                </div>
                {procedure.removed && (
                    <ErrorBanner className="mt-2">Removed</ErrorBanner>
                )}
            </Section>

            <Section title="Patient" collapsible>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <LabelValue
                        label="Hospital ID"
                        value={patient?.hospitalId}
                        copyButton={true}
                    />
                    <LabelValue
                        label="Phone"
                        value={patient?.phone}
                        copyButton={true}
                    />
                    <LabelValue label="Address" value={patient?.address} />
                </div>
            </Section>

            <Section
                title={
                    <>
                        Procedure Plan
                        {/* The one-line description the list rows show, so
                            the closed section still says what is planned. */}
                        {procedureName && (
                            <span className="ml-2 min-w-0 truncate font-normal text-xs text-gray-600">
                                {procedureName}
                            </span>
                        )}
                    </>
                }
                collapsible
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <LabelValue
                        className="md:col-span-3"
                        label="Diagnosis"
                        value={procedure.diagnosis}
                    />
                    {/* The latest status, read off the procedure as the list
                        row does; the timeline is on the Lists page. */}
                    <LabelValue
                        label="PAC Status"
                        value={<PacStatusSmall status={procedure.pacStatus} />}
                    />
                    <LabelListValue
                        className="md:col-span-4"
                        label="Procedure"
                        value={procedureCodes}
                    />
                    <LabelValue
                        className="md:col-span-4"
                        label="Comorbidities"
                        value={procedure.comorbids}
                    />
                    <LabelValue
                        label="Anesthesia"
                        value={procedure.anesthesia}
                    />
                    <LabelValue
                        label="Expected Duration (minutes)"
                        value={procedure.duration}
                    />
                    <LabelValue label="Admitted Bed" value={procedure.bed} />
                    <LabelValue
                        label="Added"
                        value={`${calendarDate(procedure.addedDate).format(
                            "DD MMM YYYY",
                        )}${
                            procedure.expand?.addedBy?.name
                                ? ` by ${procedure.expand.addedBy.name}`
                                : ""
                        }`}
                    />
                    <LabelValue
                        className="md:col-span-4"
                        label="Remarks"
                        value={procedure.remarks}
                    />
                    <LabelValue
                        className="md:col-span-4"
                        label="Special Requirements"
                        value={procedure.requirements}
                    />
                </div>
                {/* The same case on the Lists page, opened and scrolled to,
                    which is where it is edited, moved or removed. */}
                <Link
                    to={`/lists/${otDay.id}?procedureId=${procedure.id}&scrollTo=${procedure.id}`}
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                    <ExternalLinkIcon size={14} aria-hidden="true" />
                    Open in OT list
                </Link>
                <div className="text-xs text-gray-500 px-3 py-2 sm:flex sm:justify-end gap-3">
                    <div>
                        Created{" "}
                        {hospitalTime(procedure.created).format(
                            "DD MMM YYYY HH:mm",
                        )}{" "}
                        by{" "}
                        <span className="font-semibold">
                            {procedure.expand?.creator?.name}
                        </span>
                    </div>
                    {procedure.created !== procedure.updated && (
                        <div>
                            Updated{" "}
                            {hospitalTime(procedure.updated).format(
                                "DD MMM YYYY HH:mm",
                            )}{" "}
                            by{" "}
                            <span className="font-semibold">
                                {procedure.expand?.updater?.name}
                            </span>
                        </div>
                    )}
                </div>
            </Section>

            <Section>
                <ProcedureChecklist procedure={procedure} />
            </Section>

            <Section>
                <Collapsible
                    summaryClassName="text-sm font-semibold"
                    summary={<>Comments</>}
                >
                    <ProcedureComments procedureId={procedure.id} />
                </Collapsible>
            </Section>
        </div>
    );
}

export default OtProcedureView;
