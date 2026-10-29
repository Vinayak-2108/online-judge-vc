import type { Roast } from "../types";

export const ROAST_LABEL: Record<Roast, string> = {
    light: "Light roast",
    medium: "Medium roast",
    dark: "Dark roast",
};

export const ROAST_ORDER: Record<Roast, number> = { light: 0, medium: 1, dark: 2 };

export const LANGUAGE_LABEL: Record<string, string> = {
    cpp: "C++",
    c: "C",
    py: "Python",
    java: "Java",
};

/** 16 -> "0.016 s"; unknown (null) -> a dash. */
export function formatRuntime(ms: number | null | undefined): string {
    return ms == null ? "—" : `${(ms / 1000).toFixed(3)} s`;
}

export function formatPercent(value: number | null | undefined): string {
    return value == null ? "—" : `${value.toFixed(1)}%`;
}

export function formatTests(passed: number | null, total: number | null): string {
    return passed == null || total == null ? "—" : `${passed}/${total}`;
}

export function formatWhen(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export type VerdictTone = "positive" | "negative" | "warning";

export function verdictTone(verdict: string): VerdictTone {
    if (verdict === "Accepted") return "positive";
    if (verdict.startsWith("Time Limit")) return "warning";
    return "negative";
}
