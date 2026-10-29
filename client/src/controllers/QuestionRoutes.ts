import type { Question } from "../types";

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`

const authHeaders = () => ({
    "Content-Type" : "application/json",
    "Authorization": `Token ${localStorage.getItem('token')}`,
});

export const get_all_questions = async(): Promise<Question[]> => {
    // The token is optional: with it each problem carries the caller's status.
    const token = localStorage.getItem('token');
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

export const run_compiler = async(obj: Record<string, unknown>) => {
    const res = await fetch(`${base}/questions/run`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: authHeaders(),
    });
    const ans = await res.json();
    return ans;
}

export const submit_compiler = async(obj: Record<string, unknown>) => {
    const res = await fetch(`${base}/questions/submit`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: authHeaders(),
    });
    const ans = await res.json();
    return ans;
}
