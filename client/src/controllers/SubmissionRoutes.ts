import type { Submission } from "../types";

const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export const get_all_submissions = async(): Promise<Submission[]> => {
    const res = await fetch(`${base}/submissions/`);
    const ans = await res.json();
    return ans;
}
