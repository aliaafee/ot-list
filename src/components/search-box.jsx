import { forwardRef, useId, useRef } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

/**
 * SearchBox - Reusable search text input with icon, clear button and error handling
 *
 * @param {string} value - Current value of the search box
 * @param {function} onChange - Called with (value, event); event is null when cleared
 * @param {function} onSearch - Called with the current value when Enter is pressed
 * @param {function} onClear - Called after the clear button empties the box
 * @param {string} label - Label text shown above the search box
 * @param {string} placeholder - Placeholder text, defaults to the label
 * @param {string} name - Name attribute for the input
 * @param {boolean} error - Whether the field has an error
 * @param {string} errorMessage - Error message to display
 * @param {boolean} showClear - Whether to show the clear button when there is a value
 * @param {string} className - Additional CSS classes for the container
 * @param {string} inputClassName - Additional CSS classes for the input element
 * @param {boolean} disabled - Whether the search box is disabled
 * @param {ReactNode} children - Extra content rendered below the input, e.g. a results list
 */
const SearchBox = forwardRef(
    (
        {
            value = "",
            onChange,
            onSearch,
            onClear,
            label = "",
            placeholder = "",
            name = "search",
            error = false,
            errorMessage = "",
            showClear = true,
            className = "",
            inputClassName = "",
            disabled = false,
            children,
            ...props
        },
        ref,
    ) => {
        const generatedId = useId();
        // Callers may supply their own id through props; theirs wins, because
        // the spread below would override ours anyway.
        const inputId = props.id ?? `${generatedId}-input`;
        const errorId = `${generatedId}-error`;

        // The input is needed here to restore focus, but `ref` belongs to the
        // caller, so keep our own and feed both from one callback.
        const inputRef = useRef(null);
        const attachInput = (node) => {
            inputRef.current = node;
            if (typeof ref === "function") {
                ref(node);
            } else if (ref) {
                ref.current = node;
            }
        };

        const handleClear = () => {
            onChange?.("", null);
            onClear?.();
            // The clear button unmounts the moment the box empties, so focus
            // would land on <body> and the field would be lost to the
            // keyboard. Put the caret back where the user was typing.
            inputRef.current?.focus();
        };

        return (
            <div className={twMerge("flex flex-col gap-1", className)}>
                {!!label && (
                    <label
                        htmlFor={inputId}
                        className={twMerge(
                            "text-xs opacity-0 text-left text-gray-700",
                            !!value && "opacity-100",
                        )}
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <SearchIcon
                        width={16}
                        height={16}
                        aria-hidden="true"
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                    <input
                        ref={attachInput}
                        id={inputId}
                        type="text"
                        name={name}
                        value={value}
                        aria-invalid={!!error || undefined}
                        aria-describedby={errorMessage ? errorId : undefined}
                        onChange={(e) => onChange?.(e.target.value, e)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                onSearch?.(value);
                            }
                        }}
                        placeholder={placeholder || label || "Search"}
                        disabled={disabled}
                        autoComplete="off"
                        className={twMerge(
                            "w-full rounded p-1 pl-7 bg-white border border-gray-200",
                            !!value && showClear && "pr-7",
                            !!error && "border-red-500 bg-red-50",
                            inputClassName,
                        )}
                        {...props}
                    />
                    {showClear && !!value && !disabled && (
                        <button
                            type="button"
                            title="Clear"
                            aria-label={label ? `Clear ${label}` : "Clear"}
                            onClick={handleClear}
                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        >
                            <XIcon width={14} height={14} aria-hidden="true" />
                        </button>
                    )}
                    {children}
                </div>
                {!!errorMessage && (
                    <p id={errorId} className="text-xs text-red-500">
                        {errorMessage}
                    </p>
                )}
            </div>
        );
    },
);

SearchBox.displayName = "SearchBox";

export default SearchBox;
