export const OtListColours = {
    red: "bg-red-400",
    orange: "bg-orange-400",
    yellow: "bg-yellow-400",
    green: "bg-green-400",
    teal: "bg-teal-400",
    blue: "bg-blue-400",
    purple: "bg-purple-400",
};

export const UserColours = [
    "bg-red-400",
    "bg-orange-400",
    "bg-amber-400",
    "bg-yellow-400",
    "bg-lime-400",
    "bg-green-400",
    "bg-emerald-400",
    "bg-teal-400",
    "bg-blue-400",
    "bg-indigo-400",
    "bg-violet-400",
    "bg-purple-400",
    "bg-fuchsia-400",
];

export const getStatusColor = (status) => {
    if (!status) return "bg-gray-100 text-gray-800 border-gray-300";
    switch (status.toLowerCase()) {
        case "referred":
            return "bg-blue-200 text-blue-800 border-blue-300";
        case "inreview":
            return "bg-yellow-200 text-yellow-800 border-yellow-300";
        case "cleared":
            return "bg-green-200 text-green-800 border-green-300";
        case "unfit":
            return "bg-red-200 text-red-800 border-red-300";
        default:
            return "bg-gray-200 text-gray-600 border-gray-300";
    }
};
