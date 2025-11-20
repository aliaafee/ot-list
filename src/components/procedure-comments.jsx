import { useAuth } from "@/contexts/auth-context";
import { formatDateTime } from "@/utils/dates";
import { SendHorizonalIcon } from "lucide-react";
import { useEffect, useState } from "react";

function ProcedureComments(procedureId) {
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState("");
    const { user } = useAuth();

    useEffect(() => {
        // Fetch comments for the given procedureId
        // This is a placeholder for actual data fetching logic

        setComments([
            {
                id: 1,
                time: "2022-02-02 11:00:00",
                user: "Jane Doe",
                text: "Great procedure!",
            },
            {
                id: 2,
                time: "2022-02-03 12:30:00",
                user: "Jane Doe",
                text: "Very helpful, thanks!",
            },
            {
                id: 3,
                time: "2022-02-04 14:15:00",
                user: "Jane Doe",
                text: "Could use more details.",
            },
        ]);
    }, [procedureId]);

    const handleSendComment = (e) => {
        e.preventDefault();
        // Logic to send comment goes here
        setComments([
            ...comments,
            {
                id: comments.length + 1,
                time: new Date().toISOString(),
                user: user.name,
                text: commentText,
            },
        ]);
        setCommentText("");
    };

    return (
        <div className="p-2">
            <span className="text-sm">Comments</span>
            <ul>
                {comments.map((comment) => (
                    <li
                        key={comment.id}
                        className="text-sm mb-2 p-1 rounded-md bg-gray-200 select-text"
                    >
                        {comment.text}
                        <div className="text-xs text-gray-500 text-right">
                            {comment.user} - {formatDateTime(comment.time)}
                        </div>
                    </li>
                ))}
            </ul>
            <form className="flex">
                <textarea
                    className="text-sm p-1 rounded-md bg-white w-full resize-none"
                    placeholder="Add a comment"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                ></textarea>
                <button
                    className="rounded-md p-2 bg-blue-600 hover:bg-blue-500 ml-2 text-white cursor-pointer"
                    title="Send Comment"
                    onClick={handleSendComment}
                >
                    <SendHorizonalIcon size={16} />
                </button>
            </form>
        </div>
    );
}

export default ProcedureComments;
