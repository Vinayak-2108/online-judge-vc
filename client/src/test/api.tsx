import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { AppRoutes } from "../utils/router";

export const problem = (id: number, name: string, slug: string, difficulty: string, extra: object = {}) => ({
    id,
    name,
    slug,
    difficulty,
    description: "Read two integers and print their sum.",
    input_format: "Two integers a and b.",
    output_format: "One integer: a + b.",
    constraints: "-1,000,000,000 <= a, b <= 1,000,000,000",
    examples: [
        { input: "2 3", output: "5", explanation: "" },
        { input: "-10\n25", output: "15", explanation: "" },
    ],
    test_count: 3,
    status: "new",
    acceptance_rate: null,
    best_runtime_ms: null,
    ...extra,
});

export const questions = [
    problem(1, "Sum of Two Numbers", "sum-of-two-numbers", "light", { status: "solved", acceptance_rate: 92.4, best_runtime_ms: 16 }),
    problem(2, "Reverse a String", "reverse-a-string", "medium", { status: "attempted", acceptance_rate: 50 }),
    problem(3, "Nth Fibonacci", "nth-fibonacci", "dark"),
];

export const me = {
    username: "alice",
    email: "alice@school.edu",
    submissions: 2,
    solved: 1,
    attempted: 1,
    total: 3,
    by_roast: {
        light: { solved: 1, attempted: 0, total: 1 },
        medium: { solved: 0, attempted: 1, total: 1 },
        dark: { solved: 0, attempted: 0, total: 1 },
    },
};

export const sub = (id: number, extra: object = {}) => ({
    id,
    user: "alice",
    problem: "Sum of Two Numbers",
    problem_slug: "sum-of-two-numbers",
    question: 1,
    verdict: "Accepted",
    submission_time: new Date(Date.now() - 3600_000).toISOString(),
    language: "py",
    passed: 3,
    total: 3,
    runtime_ms: 16,
    ...extra,
});

export let calls: { url: string; method: string; body: unknown }[] = [];

interface Options {
    token?: boolean;
    questions?: unknown[];
    submissions?: (url: string) => unknown[];
    summary?: { everyone: number; mine: number | null };
    /** Responses for POSTs, by path suffix. */
    post?: Record<string, { status?: number; body: unknown }>;
}

export function mockApi(opts: Options = {}) {
    localStorage.clear();
    if (opts.token) localStorage.setItem("token", "t0k3n");
    calls = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init?: RequestInit) => {
            const method = init?.method ?? "GET";
            const body = init?.body ? JSON.parse(String(init.body)) : undefined;
            calls.push({ url, method, body });
            const reply = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data }) as Response;
            for (const [suffix, r] of Object.entries(opts.post ?? {})) {
                if (method === "POST" && url.endsWith(suffix)) return reply(r.body, r.status ?? 200);
            }
            if (url.includes("/accounts/test_token")) return reply({ tag: true, username: "alice", email: "alice@school.edu" });
            if (url.includes("/accounts/logout")) return reply({ message: "Logged out" });
            if (url.includes("/api/me/")) return reply(me);
            if (url.includes("/api/submissions/summary/")) return reply(opts.summary ?? { everyone: 214, mine: opts.token ? 9 : null });
            if (url.includes("/api/submissions/")) return reply(opts.submissions ? opts.submissions(url) : [sub(7)]);
            return reply(opts.questions ?? questions);
        }),
    );
}

function Where() {
    return <div data-testid="where">{useLocation().pathname + useLocation().search}</div>;
}

export function renderAt(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
            <Toaster />
            <Where />
        </MemoryRouter>,
    );
}
