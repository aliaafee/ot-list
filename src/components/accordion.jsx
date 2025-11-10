import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

const Accordion = ({ items }) => {
    const [activeIndex, setActiveIndex] = useState(null);

    const handleClick = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <div className="flex flex-col gap-4">
            {items.map((item, index) => (
                <div key={index} className="">
                    <div
                        className="text-lg flex gap-2 items-center cursor-pointer"
                        onClick={() => handleClick(index)}
                    >
                        {activeIndex === index ? (
                            <ChevronDown size={16} />
                        ) : (
                            <ChevronRight size={16} />
                        )}
                        {item.title}
                    </div>
                    {activeIndex === index && item.content}
                </div>
            ))}
        </div>
    );
};

export default Accordion;
