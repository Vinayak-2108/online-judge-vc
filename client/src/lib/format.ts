import type { Roast } from "../types";

/** One dash glyph for every unknown value. */
export const DASH = "—";

export const ROAST_LABEL: Record<Roast, string> = {
    light: "Light roast",
    medium: "Medium roast",
    dark: "Dark roast",
};

export const ROAST_ORDER: Record<Roast, number> = { light: 0, medium: 1, dark: 2 };

/**
 * Language names with the versions Judge0 actually runs (language ids in codecafe/compiler.py:
 * 50 C GCC 9.2.0, 54 C++ GCC 9.2.0, 62 Java OpenJDK 13.0.1, 71 Python 3.8.1).
 */
export const LANGUAGE_LABEL: Record<string, string> = {
    c: "C (GCC 9.2)",
    cpp: "C++ (GCC 9.2)",
    java: "Java 13",
    py: "Python 3.8",
};

export const LANGUAGES = Object.keys(LANGUAGE_LABEL);

/** The per-test-case CPU limit the judge applies (cpu_time_limit in compiler.py). */
export const TIME_LIMIT_S = 5;

/** 16 -> "0.016 s"; unknown (null) -> a dash. */
export function formatRuntime(ms: number | null | undefined): string {
    return ms == null ? DASH : `${(ms / 1000).toFixed(3)} s`;
}

export function formatPercent(value: number | null | undefined): string {
    return value == null ? DASH : `${value.toFixed(1)}%`;
}

export function formatTests(passed: number | null, total: number | null): string {
    return passed == null || total == null ? DASH : `${passed}/${total}`;
}

export type VerdictKind = "accepted" | "wrong" | "time" | "compile" | "runtime";
export type VerdictTone = "positive" | "negative" | "warning";

export function verdictKind(verdict: string): VerdictKind {
    if (verdict === "Accepted") return "accepted";
    if (verdict.startsWith("Wrong Answer")) return "wrong";
    if (verdict.startsWith("Time Limit")) return "time";
    if (verdict.startsWith("Compilation")) return "compile";
    return "runtime";
}

const SHORT: Record<VerdictKind, string> = {
    accepted: "Accepted",
    wrong: "Wrong answer",
    time: "Time limit",
    compile: "Compile error",
    runtime: "Runtime error",
};

export const VERDICT_OPTIONS: VerdictKind[] = ["accepted", "wrong", "time", "compile", "runtime"];
export const verdictShort = (verdict: string) => SHORT[verdictKind(verdict)];
export const verdictLabel = (kind: VerdictKind) => SHORT[kind];

export function verdictTone(verdict: string): VerdictTone {
    const kind = verdictKind(verdict);
    return kind === "accepted" ? "positive" : kind === "time" ? "warning" : "negative";
}

/** Runtime as shown in tables: "> 5.000 s" for a time limit, a dash when unknown (compile / runtime errors). */
export function runtimeFor(verdict: string, ms: number | null): string {
    if (verdictKind(verdict) === "time") return `> ${TIME_LIMIT_S.toFixed(3)} s`;
    return formatRuntime(ms);
}

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 min ago", "1 h ago", "Yesterday 21:40", "Mon 19:12", then a date. */
export function relativeTime(iso: string, now: Date = new Date()): string {
    const d = new Date(iso);
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (days === 0) {
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins} min ago`;
        return `${Math.floor(mins / 60)} h ago`;
    }
    if (days === 1) return `Yesterday ${hhmm(d)}`;
    if (days < 7) return `${WEEKDAY[d.getDay()]} ${hhmm(d)}`;
    return `${MONTH[d.getMonth()]} ${d.getDate()}, ${hhmm(d)}`;
}

export function clock(d: Date | number): string {
    return hhmm(new Date(d));
}
