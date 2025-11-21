import { JSONTree } from "react-json-tree";
import ModalWindow from "./modal-window";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

function ErrorModal({ message, onClose, data = {} }) {
    const [showDetails, setShowDetails] = useState(false);
    return (
        <ModalWindow title="Error" showButtons={true} onOk={onClose} okLabel="Close">
            <p>{message}</p>
            {!!data && (
                <>
                    <p
                        className="mt-2 flex items-center gap-2 cursor-pointer rounded-lg hover:underline"
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        {!!showDetails ? (
                            <ChevronDown width={16} height={16} />
                        ) : (
                            <ChevronRight width={16} height={16} />
                        )}
                        Error Details
                    </p>
                    {!!showDetails && (
                        <div className="bg-black overflow-y-auto sm:h-48 text-left">
                            <JSONTree data={data} hideRoot />
                        </div>
                    )}
                </>
            )}
        </ModalWindow>
    );
}

export default ErrorModal;
