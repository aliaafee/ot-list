import { useAuth } from "@/contexts/auth-context";
import MenuModal from "@/modals/menu-modal";
import ModalWindow from "@/modals/modal-window";
import UserModal from "@/modals/user-modal";
import { UserColours } from "@/utils/colours";
import { Menu, SettingsIcon, UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { twMerge } from "tailwind-merge";
import Logo from "./logo";

const Sections = [
    { name: "lists", label: "Lists", link: "/lists" },
    { name: "or", label: "Operating Room", link: "/or" },
    { name: "patients", label: "Patients", link: "/patients" },
    {
        name: "procedures",
        label: "Procedures",
        link: "/procedures?upcoming=true",
    },
    {
        name: "settings",
        label: "Settings",
        icon: <SettingsIcon size={16} className="inline-block" />,
        link: "/settings",
    },
];

/**
 * TitleBar - Main application navigation bar with user menu
 */
function TitleBar() {
    const { user } = useAuth();
    const [showDetails, setShowDetails] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [section, setSection] = useState("otlists");
    const location = useLocation();

    useEffect(() => {
        const currentSection = Sections.find((sec) =>
            location.pathname.startsWith(`/${sec.name}`),
        );
        if (currentSection) {
            setSection(currentSection.name);
        } else {
            setSection("");
        }
    }, [location]);

    return (
        <>
            <div className="fixed lg:static w-full top-0 h-16 min-h-16 bg-gray-300 flex items-center justify-center gap-1 flex-col z-20">
                <div className="flex h-full w-full">
                    <div className="grow flex items-center overflow-hidden whitespace-nowrap px-4">
                        <Logo />
                    </div>
                    <div className="items-end gap-1 hidden sm:flex">
                        {Sections.map(({ name, label, link, icon }) => (
                            <Link
                                key={name}
                                className={twMerge(
                                    "px-3 pt-0.5",
                                    section === name
                                        ? "bg-gray-200 rounded-t-md mb-0 pb-2"
                                        : "rounded-md hover:bg-gray-200 cursor-pointer mb-1 pb-1",
                                )}
                                to={link}
                                title={label}
                            >
                                {icon ? icon : label}
                            </Link>
                        ))}
                    </div>
                    <div className="flex p-4 gap-4">
                        <div className="flex items-center">
                            <div
                                className={twMerge(
                                    "w-10 h-10 rounded-full bg-amber-400 flex justify-center items-center cursor-pointer hover:outline-3 outline-gray-400",
                                    UserColours[
                                        user?.name.length % UserColours.length
                                    ],
                                )}
                                title={user?.name || user?.email}
                                onClick={() => setShowDetails(true)}
                            >
                                <div className="text-2xl text-black/60">
                                    {user?.name[0]}
                                </div>
                            </div>
                        </div>
                        <div className="flex sm:hidden items-center cursor-pointer">
                            <div
                                className="w-10 h-10 rounded-full bg-gray-200 flex justify-center items-center hover:outline-3 outline-gray-400"
                                onClick={() => setShowMenu(true)}
                            >
                                <Menu className="m-2" size={16} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showDetails && (
                <UserModal
                    user={user}
                    userIcon={
                        <div
                            className={twMerge(
                                "w-10 h-10 rounded-full bg-amber-400 flex justify-center items-center cursor-pointer",
                                UserColours[
                                    user?.name.length % UserColours.length
                                ],
                            )}
                        >
                            <div className="text-2xl text-black/60">
                                {user?.name[0]}
                            </div>
                        </div>
                    }
                    onClose={() => setShowDetails(false)}
                />
            )}
            {showMenu && (
                <MenuModal
                    sections={Sections}
                    onClose={() => setShowMenu(false)}
                />
            )}
        </>
    );
}

export default TitleBar;
