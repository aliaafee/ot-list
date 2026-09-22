import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { LayoutDashboardIcon } from "lucide-react";

import LabelValue from "@/components/label-value";
import Button from "@/components/button";
import { useAuth } from "@/contexts/auth-context";
import { useCatalogue } from "@/contexts/catalogue-context";
import { backendUrl, pb } from "@/lib/pb";

/**
 * SystemInfo - what this client is and what it is talking to.
 *
 * The landing page of the settings dashboard, and the first thing to read
 * when something looks wrong: which build is loaded, which backend it reached
 * and whether that backend is answering right now.
 *
 * A component rather than a plain render function because it holds the health
 * check; a page's `content` is called during render, so anything with hooks
 * has to be mounted as an element of its own.
 */
export default {
    title: "Dashboard",
    icon: <LayoutDashboardIcon width={16} height={16} />,
    // Rendered as an element by the dashboard, so it can hold the health
    // check state and its own effect.
    content: function SystemInfo() {
        const { user, isAdmin } = useAuth();
        const {
            concepts,
            levels,
            release,
            error: catalogueError,
        } = useCatalogue();

        // undefined backendUrl means the client was served by PocketBase itself,
        // so the API is wherever the page came from.
        const backend = backendUrl || window.location.origin;

        const [health, setHealth] = useState({ state: "checking" });
        const [checkKey, setCheckKey] = useState(0);

        useEffect(() => {
            let ignore = false;
            (async () => {
                const startedAt = Date.now();
                try {
                    const result = await pb.health.check();
                    if (!ignore) {
                        setHealth({
                            state: "ok",
                            message: result?.message ?? "API is healthy",
                            ms: Date.now() - startedAt,
                        });
                    }
                } catch (e) {
                    if (!ignore) {
                        setHealth({
                            state: "failed",
                            message:
                                e?.message ||
                                e?.originalError?.message ||
                                "No response",
                            ms: Date.now() - startedAt,
                        });
                    }
                }
            })();
            return () => {
                ignore = true;
            };
        }, [checkKey]);

        const recheck = () => {
            setHealth({ state: "checking" });
            setCheckKey((key) => key + 1);
        };

        const healthText = {
            checking: "Checking…",
            ok: `Reachable · ${health.ms} ms`,
            failed: `Not reachable · ${health.message}`,
        }[health.state];

        return (
            <div className="flex flex-col gap-6">
                <section>
                    <h2 className="text-gray-700 font-semibold mb-1">Client</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <LabelValue
                            label="Version"
                            value={`v${import.meta.env.PACKAGE_VERSION}`}
                        />
                        <LabelValue
                            label="Build"
                            value={
                                import.meta.env.PROD
                                    ? "production"
                                    : "development"
                            }
                        />
                        <LabelValue
                            label="Address"
                            value={window.location.origin}
                            copyButton
                        />
                        <LabelValue
                            label="Signed in as"
                            value={
                                user
                                    ? `${user.email} (${isAdmin ? "admin" : user.role})`
                                    : ""
                            }
                        />
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-gray-700 font-semibold ">
                            Backend
                        </h2>
                        <Button
                            size="xs"
                            variant="secondary"
                            onClick={recheck}
                            disabled={health.state === "checking"}
                        >
                            Check again
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <LabelValue
                            label="Address"
                            value={backend}
                            copyButton
                        />
                        <LabelValue
                            label="Status"
                            value={
                                <span
                                    className={twMerge(
                                        health.state === "ok" &&
                                            "text-green-700",
                                        health.state === "failed" &&
                                            "text-red-600",
                                    )}
                                >
                                    {healthText}
                                </span>
                            }
                        />
                        {!backendUrl && (
                            <LabelValue
                                label="Served by"
                                value="PocketBase, same origin as this page"
                            />
                        )}
                    </div>
                </section>

                <section>
                    <h2 className="text-gray-700 font-semibold mb-1">
                        Procedure catalogue
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <LabelValue label="Release" value={release} />
                        <LabelValue
                            label="Loaded"
                            value={`${concepts.length} codes · ${levels.length} spinal levels`}
                        />
                        {!!catalogueError && (
                            <LabelValue
                                label="Source"
                                value={
                                    <span className="text-amber-700">
                                        Bundled copy - the catalogue could not
                                        be read from the server
                                    </span>
                                }
                            />
                        )}
                    </div>
                </section>
            </div>
        );
    },
};
