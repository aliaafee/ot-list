import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

/**
 * Accordion - A collapsible content component
 *
 * @param {Array} items - Array of accordion items
 * @param {string} items[].title - Title text displayed in the accordion header
 * @param {ReactNode} items[].content - Content to display when accordion item is expanded
 */
const Accordion = ({ items }) => {
    const [activeIndex, setActiveIndex] = useState(null);

    const handleClick = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <div key={index} className="">
                    <div
                        className="text-lg flex gap-2 items-center cursor-pointer"
                        onClick={() => handleClick(index)}
                    >
                        <ChevronRight
                            size={16}
                            className={twMerge(
                                "transition-all",
                                activeIndex === index
                                    ? "rotate-90 "
                                    : "rotate-0"
                            )}
                        />
                        {item.title}
                    </div>

                    {activeIndex === index && item.content}
                </div>
            ))}
        </div>
    );
};

export default Accordion;
