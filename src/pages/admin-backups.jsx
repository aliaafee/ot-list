import { useEffect, useRef, useState } from "react";
import {
    DatabaseBackupIcon,
    DownloadIcon,
    LogOutIcon,
    PlusIcon,
    RefreshCwIcon,
    RotateCcwIcon,
    TrashIcon,
    UploadIcon,
} from "lucide-react";
import dayjs from "dayjs";

import Button from "@/components/button";
import FormField from "@/components/form-field";
import Logo from "@/components/logo";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
    ToolBarTitle,
} from "@/components/toolbar";
import { LoadingSpinner } from "@/components/loading-spinner";
import ModalContainer from "@/modals/modal-container";
import ModalWindow from "@/modals/modal-window";
import ErrorModal from "@/modals/error-modal";
import {
    SuperuserAuthProvider,
    useSuperuserAuth,
} from "@/contexts/superuser-auth-context";
import { backendUrl, pbAdmin } from "@/lib/pb";

/** A backup's size, in the units a person reads it in. */
function formatSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value = value / 1024;
        unit++;
    }
    return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** PocketBase reports the modified time as "2026-09-18 03:12:44.123Z". */
function formatModified(modified) {
    const parsed = dayjs(modified);
    return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm") : modified;
}

/**
 * SuperuserLogin - the gate on this page.
 *
 * These are the PocketBase superuser credentials, not an OT List account: the
 * backup endpoints answer to nothing else. Said plainly on the form, so nobody
 * tries their ward login and wonders why it is refused.
 */
function SuperuserLogin() {
    const { login, loading } = useSuperuserAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    const onSubmit = async (e) => {
        e.preventDefault();
        setErr("");
        try {
            await login(email, password);
        } catch (e) {
            setErr(e?.originalError?.message || e?.message || "Login failed");
        }
    };

    return (
        <ModalContainer className={"sm:max-w-xs"}>
            <form onSubmit={onSubmit}>
                <div className="bg-gray-300 px-4 pt-4 pb-4 sm:p-6 sm:pb-4 flex items-center justify-center gap-2">
                    <Logo />
                    <div className="font-mono rounded-md px-1 bg-amber-400 shadow">
                        admin
                    </div>
                </div>
                <div className="p-4 flex flex-col gap-4">
                    <FormField
                        label={"Superuser email"}
                        name={"email"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        disabled={loading}
                    />
                    <FormField
                        label={"Password"}
                        name={"password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        disabled={loading}
                    />
                    {!!err && (
                        <div className="text-xs text-red-500 text-center">
                            {err}
                        </div>
                    )}
                </div>
                <div className="px-4 pb-2 text-xs text-gray-400 text-center">
                    v{import.meta.env.PACKAGE_VERSION}
                </div>
                {!!backendUrl && (
                    <div className="px-4 pb-2 text-xs text-gray-600 text-center">
                        Backend: {backendUrl}
                    </div>
                )}
                <div className="bg-gray-200 px-4 py-3">
                    <Button
                        type="submit"
                        fullWidth
                        disabled={loading}
                        loading={loading}
                    >
                        Sign in
                    </Button>
                </div>
            </form>
        </ModalContainer>
    );
}

/** CreateBackupModal - optional name; PocketBase generates one when blank. */
function CreateBackupModal({ onCreate, onCancel, busy }) {
    const [name, setName] = useState("");

    return (
        <ModalWindow
            title="Create backup"
            icon={<DatabaseBackupIcon width={24} height={24} />}
            iconColor="bg-blue-100 text-blue-600"
            okColor="bg-blue-600"
            okLabel="Create"
            onOk={() => onCreate(name.trim())}
            onCancel={busy ? null : onCancel}
            loading={busy}
        >
            <p className="text-sm text-gray-600">
                Writes a copy of the whole database to the server&apos;s backup
                store. Writes are held for a moment while it runs.
            </p>
            <div className="mt-3">
                <FormField
                    label="Name (optional)"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Leave blank for an automatic name"
                    disabled={busy}
                />
            </div>
        </ModalWindow>
    );
}

/**
 * RestoreBackupModal - the destructive one.
 *
 * Restoring replaces pb_data with the backup's copy and restarts PocketBase,
 * so everything recorded since that backup is gone. The name has to be typed
 * out to confirm - the same friction the admin panel applies.
 */
function RestoreBackupModal({ backupKey, onRestore, onCancel, busy }) {
    const [typed, setTyped] = useState("");
    const confirmed = typed.trim() === backupKey;

    return (
        <ModalWindow
            title="Restore this backup?"
            icon={<RotateCcwIcon width={24} height={24} />}
            onOk={null}
            onCancel={null}
            customButtons={
                <>
                    <Button
                        variant="danger"
                        onClick={() => onRestore(backupKey)}
                        disabled={!confirmed || busy}
                        loading={busy}
                        className="w-full sm:ml-3 sm:w-auto"
                    >
                        Restore
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={busy}
                        className="mt-3 sm:mt-0 w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                </>
            }
        >
            <p className="text-sm text-gray-600">
                This replaces the live database with the contents of{" "}
                <span className="font-mono">{backupKey}</span> and restarts the
                server.{" "}
                <span className="font-semibold">
                    Every record added or changed since that backup was taken is
                    lost.
                </span>
            </p>
            <div className="mt-3">
                <FormField
                    label={`Type the backup name to confirm`}
                    name="confirm"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={backupKey}
                    disabled={busy}
                />
            </div>
        </ModalWindow>
    );
}

/** BackupManager - the page proper, once there is a superuser session. */
function BackupManager() {
    const { superuser, logout } = useSuperuserAuth();
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState("");
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState("");
    const [restoring, setRestoring] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const uploadInput = useRef(null);

    const fail = (message, e) => {
        console.error(message, e);
        setError({
            message: e?.response?.message || message,
            data: e?.response,
        });
    };

    // Every reload of the list goes through refreshKey, so an action only has
    // to say "the list changed" and the effect does the fetching.
    const refresh = () => {
        setLoading(true);
        setRefreshKey((key) => key + 1);
    };

    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const list = await pbAdmin.backups.getFullList();
                // Newest first: the one you want is almost always the last
                // one taken.
                const sorted = [...list].sort((a, b) =>
                    (b.modified ?? "").localeCompare(a.modified ?? ""),
                );
                if (!ignore) setBackups(sorted);
            } catch (e) {
                if (!ignore) fail("Could not list the backups", e);
            } finally {
                if (!ignore) setLoading(false);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    // Downloads cannot carry an auth header, so PocketBase takes a short-lived
    // file token in the query string instead.
    const handleDownload = async (key) => {
        setBusy(key);
        try {
            const token = await pbAdmin.files.getToken();
            window.location.assign(pbAdmin.backups.getDownloadURL(token, key));
        } catch (e) {
            fail("Could not start the download", e);
        } finally {
            setBusy("");
        }
    };

    const handleCreate = async (name) => {
        setBusy("create");
        try {
            await pbAdmin.backups.create(name);
            setCreating(false);
            setNotice("Backup created.");
            refresh();
        } catch (e) {
            fail("Could not create the backup", e);
        } finally {
            setBusy("");
        }
    };

    const handleUpload = async (file) => {
        if (!file) return;
        setBusy("upload");
        try {
            await pbAdmin.backups.upload({ file });
            setNotice(`Uploaded ${file.name}.`);
            refresh();
        } catch (e) {
            fail("Could not upload the backup", e);
        } finally {
            setBusy("");
            // Let the same file be picked again after a failure.
            if (uploadInput.current) uploadInput.current.value = "";
        }
    };

    const handleDelete = async (key) => {
        setBusy(key);
        try {
            await pbAdmin.backups.delete(key);
            setDeleting("");
            setNotice(`Deleted ${key}.`);
            refresh();
        } catch (e) {
            fail("Could not delete the backup", e);
        } finally {
            setBusy("");
        }
    };

    const handleRestore = async (key) => {
        setBusy(key);
        try {
            await pbAdmin.backups.restore(key);
        } catch (e) {
            // PocketBase restarts while it restores, so the request itself
            // often never comes back cleanly. A transport failure here is the
            // expected outcome, not a sign the restore was refused - only a
            // real API error (a 4xx with a message) says it was.
            if (e?.status && e.status !== 0) {
                fail("Could not restore the backup", e);
                setBusy("");
                return;
            }
        }
        setRestoring("");
        setBusy("");
        setNotice(
            `Restore of ${key} started. PocketBase is restarting - reload this page in a moment, and expect to sign in to the app again.`,
        );
    };

    const tools = (
        <ToolBar>
            <ToolBarTitle>Backups</ToolBarTitle>
            <div className="grow" />
            <ToolBarButton
                title="Refresh"
                onClick={refresh}
                disabled={loading || !!busy}
            >
                <RefreshCwIcon width={16} height={16} />
                <ToolBarButtonLabel>Refresh</ToolBarButtonLabel>
            </ToolBarButton>
            <ToolBarButton
                title="Create a backup"
                onClick={() => setCreating(true)}
                disabled={!!busy}
            >
                <PlusIcon width={16} height={16} />
                <ToolBarButtonLabel>Create</ToolBarButtonLabel>
            </ToolBarButton>
            <ToolBarButton
                title="Upload a backup file"
                onClick={() => uploadInput.current?.click()}
                disabled={!!busy}
            >
                <UploadIcon width={16} height={16} />
                <ToolBarButtonLabel>Upload</ToolBarButtonLabel>
            </ToolBarButton>
            <ToolBarButton title="Sign out" onClick={logout} disabled={!!busy}>
                <LogOutIcon width={16} height={16} />
                <ToolBarButtonLabel>Sign out</ToolBarButtonLabel>
            </ToolBarButton>
        </ToolBar>
    );

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <div className="bg-gray-200 shadow-md sticky top-0 z-10">
                <div className="mx-auto max-w-4xl">{tools}</div>
            </div>
            <div className="grow w-full max-w-4xl mx-auto px-2 pt-4 pb-20">
                <input
                    ref={uploadInput}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                />

                <div className="text-xs text-gray-500 mb-4">
                    Signed in as {superuser?.email}
                    {!!backendUrl && ` · ${backendUrl}`}
                </div>

                {!!notice && (
                    <div className="mb-4 rounded-md bg-blue-50 text-blue-800 text-sm px-3 py-2 flex items-start gap-2">
                        <span className="grow">{notice}</span>
                        <button
                            className="text-blue-600 cursor-pointer"
                            onClick={() => setNotice("")}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {busy === "upload" && (
                    <div className="mb-4 text-sm text-gray-600">Uploading…</div>
                )}

                {loading ? (
                    <LoadingSpinner className="py-12" />
                ) : backups.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center">
                        No backups yet. Create one, or set a schedule in the
                        PocketBase admin panel.
                    </div>
                ) : (
                    <ul className="flex flex-col divide-y divide-gray-200">
                        {backups.map((backup) => (
                            <li
                                key={backup.key}
                                className="py-3 flex flex-col sm:flex-row sm:items-center gap-2"
                            >
                                <div className="grow min-w-0">
                                    <div className="text-sm font-medium text-gray-900 break-all">
                                        {backup.key}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {formatSize(backup.size)} ·{" "}
                                        {formatModified(backup.modified)}
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                            handleDownload(backup.key)
                                        }
                                        disabled={!!busy}
                                        loading={busy === backup.key}
                                        className="gap-1"
                                    >
                                        <DownloadIcon width={14} height={14} />
                                        Download
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setRestoring(backup.key)}
                                        disabled={!!busy}
                                        className="gap-1"
                                    >
                                        <RotateCcwIcon width={14} height={14} />
                                        Restore
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => setDeleting(backup.key)}
                                        disabled={!!busy}
                                        className="gap-1"
                                    >
                                        <TrashIcon width={14} height={14} />
                                        Delete
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {creating && (
                    <CreateBackupModal
                        busy={busy === "create"}
                        onCreate={handleCreate}
                        onCancel={() => setCreating(false)}
                    />
                )}

                {!!deleting && (
                    <ModalWindow
                        title="Delete this backup?"
                        okLabel="Delete"
                        loading={busy === deleting}
                        onOk={() => handleDelete(deleting)}
                        onCancel={() => setDeleting("")}
                    >
                        <p className="text-sm text-gray-600">
                            <span className="font-mono">{deleting}</span> is
                            removed from the server for good. The live database
                            is not touched.
                        </p>
                    </ModalWindow>
                )}

                {!!restoring && (
                    <RestoreBackupModal
                        backupKey={restoring}
                        busy={busy === restoring}
                        onRestore={handleRestore}
                        onCancel={() => setRestoring("")}
                    />
                )}

                {!!error && (
                    <ErrorModal
                        message={error.message}
                        data={error.data}
                        onClose={() => setError(null)}
                    />
                )}
            </div>
        </div>
    );
}

/** The route element: the superuser gate, then the manager. */
function AdminBackupsPage() {
    const { isSuperuser } = useSuperuserAuth();
    return isSuperuser ? <BackupManager /> : <SuperuserLogin />;
}

/**
 * AdminBackups - standalone backups page, outside the app's own session.
 *
 * It carries its own provider so the superuser client is only created when
 * someone opens this route, and so the page still works when nobody can sign
 * in to OT List itself.
 */
export default function AdminBackups() {
    return (
        <SuperuserAuthProvider>
            <AdminBackupsPage />
        </SuperuserAuthProvider>
    );
}
