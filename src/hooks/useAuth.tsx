import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { api, getToken, setToken, clearToken, type AppRole, type ApiUser, type ApiProfile } from "@/lib/api";

interface AuthContextValue {
  user: ApiUser | null;
  profile: ApiProfile | null;
  roles: AppRole[];
  isModerator: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  /** Persist a freshly issued token and load the session. */
  setSession: (token: string) => Promise<void>;
  /** Re-fetch the current user from the API. */
  refresh: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setProfile(null);
      setRoles([]);
      return;
    }
    try {
      const me = await api.auth.me();
      setUser(me.user);
      setProfile(me.profile);
      setRoles(me.roles);
    } catch {
      // Token invalid/expired — clear it.
      clearToken();
      setUser(null);
      setProfile(null);
      setRoles([]);
    }
  }, []);

  // Load the session on mount (browser only; getToken is a no-op on the server).
  useEffect(() => {
    let active = true;
    (async () => {
      await loadMe();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadMe]);

  const setSession = useCallback(
    async (token: string) => {
      setToken(token);
      await loadMe();
    },
    [loadMe]
  );

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setProfile(null);
    setRoles([]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        roles,
        isModerator: roles.includes("moderator"),
        isAuthenticated: !!user,
        loading,
        setSession,
        refresh: loadMe,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
