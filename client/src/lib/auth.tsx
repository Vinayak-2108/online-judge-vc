import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { auth_user, logout_user } from "../controllers/UserRoutes";
import { getToken, storage } from "./storage";

interface AuthState {
    /** The signed-in username, or null when logged out. */
    user: string | null;
    email: string | null;
    /** false while a stored token is still being checked. */
    ready: boolean;
    logout: () => Promise<void>;
    /** Stores a fresh token and loads the account it belongs to. */
    login: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthState>({
    user: null,
    email: null,
    ready: true,
    logout: async () => {},
    login: async () => {},
});

function storedToken(): string | null {
    try {
        return getToken();
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [account, setAccount] = useState<{ user: string; email: string } | null>(null);
    const [ready, setReady] = useState(() => !storedToken());

    const check = useCallback(async () => {
        if (!storedToken()) {
            setAccount(null);
            return;
        }
        try {
            const data = await auth_user();
            if (data.tag) setAccount({ user: data.username ?? "", email: data.email ?? "" });
            else {
                storage.remove('token'); // revoked or expired
                setAccount(null);
            }
        } catch {
            // offline: keep the token, show logged out for now
        }
    }, []);

    useEffect(() => {
        if (!storedToken()) return; // nothing to check: already ready and logged out
        let live = true;
        auth_user()
            .then((data) => {
                if (!live) return;
                if (data.tag) setAccount({ user: data.username ?? "", email: data.email ?? "" });
                else storage.remove('token'); // revoked or expired
            })
            .catch(() => {})
            .finally(() => live && setReady(true));
        return () => {
            live = false;
        };
    }, []);

    const login = useCallback(
        async (token: string) => {
            try {
                storage.set("token", token);
            } catch {
                // storage blocked: the session lasts for this page view only
            }
            await check();
            setReady(true);
        },
        [check],
    );

    const logout = useCallback(async () => {
        await logout_user();
        setAccount(null);
    }, []);

    const value = useMemo(
        () => ({ user: account?.user ?? null, email: account?.email ?? null, ready, logout, login }),
        [account, ready, logout, login],
    );
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
