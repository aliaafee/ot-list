import { useState } from "react";
import { twMerge } from "tailwind-merge";
import LabelValue from "./label-value";
import { age } from "@/utils/dates";

function ProcedureItem({ procedure }) {
    const [updating, setUpdating] = useState(false);

    const SimplifiedView = () => {
        return (
            <div
                className={twMerge(
                    "transition-colors flex-auto p-2 grid grid-cols-8 lg:grid-cols-12 cursor-pointer gap-1 ",
                    updating ? "animate-pulse" : "",
                    !!procedure.removed && "line-through"
                )}
                onClick={() => {
                    onSelect();
                }}
            >
                <LabelValue value={!procedure.removed && procedure.order} />
                <LabelValue
                    // label="NID"
                    value={procedure.expand.patient.nid}
                    className="col-span-2 lg:col-span-1"
                />
                <LabelValue
                    className="col-span-2 lg:col-span-3"
                    // label="Name"
                    value={procedure.expand.patient.name}
                />
                <LabelValue
                    // label="Age/Sex"
                    value={`${age(procedure.expand.patient.dateOfBirth)} / ${
                        procedure.expand.patient.sex[0]
                    }`}
                    className="col-span-1 hidden lg:inline"
                />
                <LabelValue
                    className="col-span-3 hidden lg:inline"
                    // label="Diagnosis"
                    value={procedure.diagnosis}
                />
                <LabelValue
                    className="col-span-3"
                    // label="Procedure"
                    value={procedure.procedure}
                />
            </div>
        );
    };

    return <SimplifiedView />;
}

export default ProcedureItem;
