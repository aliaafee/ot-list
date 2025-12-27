import { twMerge } from "tailwind-merge";
/**
 * Logo - Application logo/branding component
 */
export default function Logo({ className }) {
    return (
        <span
            className={twMerge(
                `uppercase text-xl text-gray-600 font-thin`,
                className
            )}
        >
            Operating Lists
        </span>
    );
}
