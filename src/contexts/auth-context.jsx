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
      setLoading(false);
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
        const authData = await pb
          .collection("users")
          .authWithPassword(email, password, { autoRefreshThreshold: 30 * 60 });
        setLoading(false);
        setUser(authData.record);
        return authData.record;
      },

      register: async ({ email, password, passwordConfirm }) => {
        // Your users collection must be “users” with standard fields
        setLoading(true);
        const record = await pb
          .collection("users")
          .create({ email, password, passwordConfirm });

        setLoading(false);
        return record;
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
