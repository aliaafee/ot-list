import { useAuth } from "@/contexts/auth-context";
import { formatDateTime } from "@/utils/dates";
import { SendHorizonalIcon } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "@/components/button";
import { pb } from "@/lib/pb";
import { twMerge } from "tailwind-merge";
import { RoleLabels } from "@/utils/labels";

/**
 * ProcedureComments - Display and manage comments for a procedure
 *
 * @param {string} procedureId - ID of the procedure to show comments for
 */
function ProcedureComments({ procedureId }) {
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const { user } = useAuth();

    const appendComment = (comment) => {
        setComments((prev) => {
            if (prev.some((c) => c.id === comment.id)) {
                return prev; // Comment already exists, do not add
            }
            return [...prev, comment];
        });
    };

    useEffect(() => {
        if (!procedureId) return;

        const filter = pb.filter("procedure = {:procedureId}", {
            procedureId: procedureId,
        });

        let cancelled = false;
        let unsubscribe;

        // Fetch initial comments
        const fetchComments = async () => {
            setLoading(true);
            try {
                const records = await pb
                    .collection("procedureComments")
                    .getFullList({
                        filter,
                        sort: "+created",
                        expand: "creator",
                    });
                if (cancelled) return;
                setComments(records);
            } catch (error) {
                if (cancelled) return;
                console.error("Error fetching comments:", error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchComments();

        const handleEvent = (e) => {
            if (e.record.procedure !== procedureId) return;

            if (e.action === "create") {
                appendComment(e.record);
            } else if (e.action === "update") {
                // Update comment (including removed status)
                setComments((prev) =>
                    prev.map((c) => (c.id === e.record.id ? e.record : c)),
                );
            } else if (e.action === "delete") {
                // Remove deleted comment
                setComments((prev) => prev.filter((c) => c.id !== e.record.id));
            }
        };

        // Subscribe to real-time updates.
        //
        // The filter is passed to subscribe as well as to the fetch above, and
        // it is what makes switching procedures work. Selecting another
        // procedure unmounts this component and mounts a new one in the same
        // commit, so the old subscription is dropped and the new one created
        // together. PocketBase builds its subscription key from the topic plus
        // these options and decides whether to re-attach its event listeners by
        // comparing only the set of keys against the one it last sent. Without
        // the filter both subscriptions share the key "procedureComments/*", the
        // set looks unchanged, and the new listener is registered but never
        // attached to the event source, so no events arrive. Including the
        // procedure in the filter gives each one a distinct key, and also means
        // the server only sends events for this procedure.
        (async () => {
            try {
                const off = await pb
                    .collection("procedureComments")
                    .subscribe("*", handleEvent, {
                        filter,
                        expand: "creator",
                    });
                if (cancelled) {
                    off();
                    return;
                }
                unsubscribe = off;
            } catch (error) {
                console.error("Error subscribing to comments:", error);
            }
        })();

        // Cleanup subscription
        return () => {
            cancelled = true;
            if (unsubscribe) unsubscribe();
        };
    }, [procedureId]);

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !procedureId) return;

        setSending(true);
        try {
            const newComment = await pb.collection("procedureComments").create(
                {
                    procedure: procedureId,
                    content: commentText.trim(),
                    removed: false,
                },
                { expand: "creator" },
            );
            appendComment(newComment);
            setCommentText("");
        } catch (error) {
            console.error("Error sending comment:", error);
        } finally {
            setSending(false);
        }
    };

    const handleRemoveComment = async (commentId) => {
        try {
            await pb.collection("procedureComments").update(commentId, {
                removed: true,
            });
        } catch (error) {
            console.error("Error removing comment:", error);
        }
    };

    const handleRestoreComment = async (commentId) => {
        try {
            await pb.collection("procedureComments").update(commentId, {
                removed: false,
            });
        } catch (error) {
            console.error("Error restoring comment:", error);
        }
    };

    return (
        <div className="p-2">
            <span className="text-sm font-semibold">Comments</span>
            {loading ? (
                <div className="text-xs text-gray-500 py-2">
                    Loading comments...
                </div>
            ) : (
                <ul className="">
                    {comments.length === 0 ? (
                        <li className="text-xs text-gray-500 py-2">
                            No comments yet
                        </li>
                    ) : (
                        comments.map((comment) => (
                            <li
                                key={comment.id}
                                className={twMerge(
                                    "text-sm mb-2 py-1 px-2 rounded-md select-text flex justify-between items-start gap-2 border border-gray-200 bg-gray-50",
                                )}
                            >
                                <div className="flex-1">
                                    <span
                                        className={
                                            comment.removed
                                                ? "line-through"
                                                : ""
                                        }
                                    >
                                        {comment.content}
                                    </span>
                                    <div className="text-xs text-gray-500 text-right flex gap-2 justify-end">
                                        {comment.creator === user.id &&
                                            !comment.removed && (
                                                <button
                                                    className="text-red-600 rounded hover:bg-red-100 px-1 shrink-0 cursor-pointer"
                                                    onClick={() =>
                                                        handleRemoveComment(
                                                            comment.id,
                                                        )
                                                    }
                                                    title="Remove comment"
                                                    type="button"
                                                >
                                                    remove
                                                </button>
                                            )}
                                        {comment.creator === user.id &&
                                            comment.removed && (
                                                <button
                                                    className="text-blue-600 rounded hover:bg-blue-200 px-1 shrink-0 cursor-pointer"
                                                    onClick={() =>
                                                        handleRestoreComment(
                                                            comment.id,
                                                        )
                                                    }
                                                    title="Restore comment"
                                                    type="button"
                                                >
                                                    restore
                                                </button>
                                            )}
                                        <span className="font-semibold">
                                            {comment.expand?.creator?.name ||
                                                comment.expand?.creator
                                                    ?.email ||
                                                comment.creator ||
                                                "Unknown"}
                                        </span>
                                        <span>
                                            {RoleLabels?.[
                                                comment.expand?.creator?.role
                                            ] ||
                                                comment.expand?.creator?.role ||
                                                "user"}
                                        </span>
                                        <span>
                                            {formatDateTime(comment.created)}
                                        </span>
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            )}
            <form className="flex" onSubmit={handleSendComment}>
                <input
                    className="text-sm py-1 px-2 rounded-md bg-white w-full resize-none border border-gray-300"
                    placeholder="Add a comment"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    type="text"
                    disabled={sending}
                />
                <Button
                    className="ml-2"
                    title="Send Comment"
                    type="submit"
                    size="sm"
                    disabled={sending || !commentText.trim()}
                    loading={sending}
                >
                    <SendHorizonalIcon size={16} />
                </Button>
            </form>
        </div>
    );
}

export default ProcedureComments;
