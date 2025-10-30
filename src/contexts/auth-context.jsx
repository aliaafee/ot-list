import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pb";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(pb.authStore.record);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // initial refresh attempt
        (async () => {
            setUser(pb.authStore.record);
            try {
                if (!pb.authStore.isValid) {
                    pb.authStore.clear();
                } else {
                    await pb.collection("users").authRefresh();
                }
            } catch (e) {
                pb.authStore.clear(); // after this call pb.authStore.isValid will be false
            } finally {
                setLoading(false);
            }
        })();

        // subscribe to auth changes
        const unsubscribe = pb.authStore.onChange((_token, record) => {
            setUser(record);
        });
        return unsubscribe;
    }, []);

    const value = useMemo(
        () => ({
            user,
            isAuthed: !!user,

            login: async (email, password) => {
                setLoading(true);
                try {
                    const authData = await pb
                        .collection("users")
                        .authWithPassword(email, password, {
                            autoRefreshThreshold: 30 * 60,
                        });
                    setUser(authData.record);
                    return authData.record;
                } catch (e) {
                    throw {
                        message: "Login Error",
                        originalError: e,
                    };
                } finally {
                    setLoading(false);
                }
            },

            register: async ({ email, password, passwordConfirm }) => {
                // Your users collection must be “users” with standard fields
                setLoading(true);
                try {
                    const record = await pb
                        .collection("users")
                        .create({ email, password, passwordConfirm });
                    return record;
                } catch (e) {
                    throw {
                        message: "Register Error",
                        originalError: e,
                    };
                } finally {
                    setLoading(false);
                }
            },

            logout: () => {
                pb.authStore.clear();
                setUser(null);
            },
        }),
        [user]
    );

    return (
        <AuthContext.Provider value={{ ...value, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
