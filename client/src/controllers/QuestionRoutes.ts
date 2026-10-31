import type { Question, RunResponse, SubmitResponse } from "../types";
import { getToken } from "../lib/storage";

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`

const authHeaders = () => ({
    "Content-Type" : "application/json",
    "Authorization": `Token ${getToken()}`,
});

export const get_all_questions = async(): Promise<Question[]> => {
    // The token is optional: with it each problem carries the caller's status.
    const token = getToken();
    let res = await fetch(`${base}/questions/`, {
        headers: token ? { "Authorization": `Token ${token}` } : {},
    });
    // A revoked token is rejected outright; fall back to the anonymous list.
    if (res.status === 401) res = await fetch(`${base}/questions/`);
    const ans = await res.json();
    return Array.isArray(ans) ? ans : [];
}
export const get_question = async(id: number | string) => {
    const res = await fetch(`${base}/questions/${id}/`);
    const ans = await res.json();
    return ans;
}

export interface ApiResult<T> {
    ok: boolean;
    status: number;
    data: T;
}

async function post<T>(path: string, obj: Record<string, unknown>): Promise<ApiResult<T>> {
    const res = await fetch(`${base}/questions/${path}`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

export const run_compiler = (obj: Record<string, unknown>) => post<RunResponse>('run', obj);
export const submit_compiler = (obj: Record<string, unknown>) => post<SubmitResponse>('submit', obj);
