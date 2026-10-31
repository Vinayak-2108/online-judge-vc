import type { Submission, SubmissionSummary } from "../types";
import { getToken } from "../lib/storage";

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export interface SubmissionQuery {
    mine?: boolean;
    limit?: number;
    offset?: number;
    /** accepted | wrong | time | compile | runtime */
    verdict?: string;
    /** c | cpp | java | py */
    language?: string;
    /** a problem's slug */
    problem?: string;
}

function filterParams(query: SubmissionQuery) {
    const params = new URLSearchParams();
    if (query.mine) params.set("mine", "1");
    if (query.verdict) params.set("verdict", query.verdict);
    if (query.language) params.set("language", query.language);
    if (query.problem) params.set("problem", query.problem);
    return params;
}

export const get_all_submissions = async(query: SubmissionQuery = {}): Promise<Submission[]> => {
    const params = filterParams(query);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));
    const qs = params.toString();
    const token = getToken();
    const res = await fetch(`${base}/submissions/${qs ? `?${qs}` : ""}`, {
        headers: token && query.mine ? { "Authorization": `Token ${token}` } : {},
    });
    const ans = await res.json();
    return Array.isArray(ans) ? ans : [];
}

export const get_submission_summary = async(query: SubmissionQuery = {}): Promise<SubmissionSummary | null> => {
    const token = getToken();
    const qs = filterParams(query).toString();
    const url = `${base}/submissions/summary/${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { headers: token ? { "Authorization": `Token ${token}` } : {} });
    if (res.status === 401 && token) {
        const anon = await fetch(`${base}/submissions/summary/`);
        return anon.ok ? await anon.json() : null;
    }
    return res.ok ? await res.json() : null;
}
