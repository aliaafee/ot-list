import BodyLayout from "@/components/body-layout";
import Logo from "@/components/logo";
import { List, ListIcon, PocketKnife, Slice, Users2Icon } from "lucide-react";
import { Link } from "react-router";

export default function Home() {
    const Title = () => (
        <div className="flex items-center justify-center sm:justify-start space-x-2 h-56 p-8">
            <div className="flex flex-col sm:flex-row justify-center gap-8 items-center">
                <ListIcon size={48} className="text-gray-400" />
                <Logo className="text-4xl text-center" />
            </div>
        </div>
    );
    return (
        <BodyLayout title={<Title />}>
            <div className="grid grid-cols-2 justify-items-center justify-center-safe w-full ">
                <Link
                    to="/operating-lists"
                    className="flex flex-col p-4 bg-amber-200 m-2 rounded-lg shadow-md hover:bg-amber-300 transition max-h-40 overflow-hidden"
                >
                    <div className="flex gap-2 items-center justify-center mb-4">
                        <List size={16} />
                        <span className="text-lg font-medium">
                            Operating Lists
                        </span>
                    </div>

                    <p className="mt-2 text-gray-600 text-center overflow-hidden">
                        View and manage the operating lists for different days.
                        Create, edit, and organize surgical procedures and
                        patient information.
                    </p>
                </Link>
                <Link
                    to="/patients"
                    className="flex flex-col p-4 bg-green-200 m-2 rounded-lg shadow-md hover:bg-green-300 transition max-h-40 overflow-hidden"
                >
                    <div className="flex gap-2 items-center justify-center mb-4">
                        <Users2Icon size={16} />
                        <span className="text-lg font-medium">Patients</span>
                    </div>
                    <p className="mt-2 text-gray-600 text-center overflow-hidden">
                        View patient records, including personal details, and
                        procedure information.
                    </p>
                </Link>
                <Link
                    to="/procedures"
                    className="flex flex-col p-4 bg-blue-200 m-2 rounded-lg shadow-md hover:bg-blue-300 transition max-h-40 overflow-hidden"
                >
                    <div className="flex gap-2 items-center justify-center mb-4">
                        <Slice size={16} />
                        <span className="text-lg font-medium">
                            All Procedures
                        </span>
                    </div>
                    <p className="mt-2 text-gray-600 text-center overflow-hidden">
                        Browse a comprehensive list of all surgical procedures
                        that have been recorded.
                    </p>
                </Link>
            </div>
        </BodyLayout>
    );
}
