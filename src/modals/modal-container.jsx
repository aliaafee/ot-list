import { twMerge } from "tailwind-merge";

function ModalContainer({ onClickOutside = () => {}, className, children }) {
    return (
        <div
            className="bg-black/30 fixed inset-0 z-100 w-screen overflow-y-auto overscroll-contain"
            onClick={onClickOutside}
        >
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div
                    className={twMerge(
                        "relative transform overflow-hidden rounded-lg bg-gray-100 text-left shadow-xl transition-all sm:my-8 w-full sm:max-w-lg",
                        className
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export default ModalContainer;
