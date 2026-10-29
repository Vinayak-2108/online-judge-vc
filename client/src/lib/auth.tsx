import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth_user, logout_user } from "../controllers/UserRoutes";

interface AuthState {
    /** The signed-in username, or null when logged out. */
    user: string | null;
    /** false while a stored token is still being checked. */
    ready: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ user: null, ready: true, logout: async () => {} });

function storedToken(): string | null {
    try {
        return localStorage.getItem("token");
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<string | null>(null);
    const [ready, setReady] = useState(() => !storedToken());

    useEffect(() => {
        if (!storedToken()) return;
        let live = true;
        auth_user()
            .then((data) => {
                if (!live) return;
                if (data.tag) setUser(data.username ?? "");
                else localStorage.removeItem("token"); // revoked or expired
            })
            .catch(() => {})
            .finally(() => live && setReady(true));
        return () => {
            live = false;
        };
    }, []);

    const logout = useCallback(async () => {
        await logout_user();
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, ready, logout }), [user, ready, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
