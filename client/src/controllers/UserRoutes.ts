import type { AuthResponse, Me } from "../types";
import { getToken, storage } from "../lib/storage";

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/accounts`;

export const register_user = async(obj: Record<string, unknown>) => {
    const res = await fetch(`${base}/signup`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const login_user = async(obj: Record<string, unknown>) => {
    const res = await fetch(`${base}/login`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const auth_user = async(): Promise<AuthResponse> => {
    const token = getToken();
    const res = await fetch(`${base}/test_token`, {
        method: 'POST',
        headers: {
            "Authorization": `Token ${token}`,
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const logout_user = async() => {
    const token = getToken();
    await fetch(`${base}/logout`, {
        method: 'POST',
        headers: {
            "Authorization": `Token ${token}`,
        },
    }).catch(() => {});
    storage.remove('token');
}

export const get_me = async(): Promise<Me | null> => {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${base.replace(/\/accounts$/, '')}/api/me/`, {
        headers: { "Authorization": `Token ${token}` },
    });
    return res.ok ? await res.json() : null;
}
