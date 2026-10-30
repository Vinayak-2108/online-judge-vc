import type { RunResponse, SubmitResponse } from "../types";
import type { ApiResult } from "./QuestionRoutes";

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/demo`;

/** The landing page's editor: public, throttled, locked to Sum of Two Numbers, never saved. */
async function post<T>(path: string, obj: Record<string, unknown>): Promise<ApiResult<T>> {
    const res = await fetch(`${base}/${path}`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: { "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
}

export const demo_run = (obj: Record<string, unknown>) => post<RunResponse>('run', obj);
export const demo_submit = (obj: Record<string, unknown>) => post<SubmitResponse>('submit', obj);
