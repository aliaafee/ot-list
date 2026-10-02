import { twMerge } from "tailwind-merge";

/**
 * ErrorBanner - the red box an error or a blocking state is shown in.
 *
 * Renders whatever it is given; callers decide whether to render it at all,
 * so `{!!error && <ErrorBanner>{error}</ErrorBanner>}` reads as it always has.
 *
 * @param {string} className - Spacing and overrides, merged over the defaults
 * @param {ReactNode} children - The message
 */
export default function ErrorBanner({ className, children }) {
    return (
        <div
            className={twMerge(
                "bg-red-400/20 rounded-md p-2 text-sm",
                className,
            )}
        >
            {children}
        </div>
    );
}
