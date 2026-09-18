import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { pbAdmin } from "@/lib/pb";

const SuperuserAuthContext = createContext(null);

/**
 * SuperuserAuthProvider - PocketBase superuser session, separate from the app's
 * own login.
 *
 * The app's `admin` role is an ordinary `users` record; PocketBase's backup
 * endpoints answer only to a `_superusers` record, the same credentials the
 * admin panel at /_/ takes. That session lives on `pbAdmin`, whose auth store
 * is in memory, so there is nothing to restore on mount and nothing left
 * behind on reload - which is why this provider has no startup refresh and
 * starts out signed out every time.
 *
 * Wrap only the routes that need it. Mounting it app-wide would keep a
 * superuser client alive on every page for no reason.
 */
export function SuperuserAuthProvider({ children }) {
    const [superuser, setSuperuser] = useState(pbAdmin.authStore.record);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        return pbAdmin.authStore.onChange((_token, record) => {
            setSuperuser(record);
        });
    }, []);

    const value = useMemo(
        () => ({
            superuser,
            isSuperuser: !!superuser,
            loading,

            login: async (email, password) => {
                setLoading(true);
                try {
                    const authData = await pbAdmin
                        .collection("_superusers")
                        .authWithPassword(email, password);
                    setSuperuser(authData.record);
                    return authData.record;
                } catch (e) {
                    // An account with MFA turned on answers the first call
                    // with an mfaId and expects a second factor, which this
                    // page does not collect - say so rather than reporting it
                    // as a wrong password.
                    if (e?.response?.mfaId) {
                        throw {
                            message:
                                "This account requires multi-factor authentication. Use the PocketBase admin panel instead.",
                            originalError: e,
                        };
                    }
                    throw {
                        message: "Superuser login failed",
                        originalError: e,
                    };
                } finally {
                    setLoading(false);
                }
            },

            logout: () => {
                pbAdmin.authStore.clear();
                setSuperuser(null);
            },
        }),
        [superuser, loading],
    );

    return (
        <SuperuserAuthContext.Provider value={value}>
            {children}
        </SuperuserAuthContext.Provider>
    );
}

export function useSuperuserAuth() {
    const ctx = useContext(SuperuserAuthContext);
    if (!ctx) {
        throw new Error(
            "useSuperuserAuth must be used within <SuperuserAuthProvider>",
        );
    }
    return ctx;
}
