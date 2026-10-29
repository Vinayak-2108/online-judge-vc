import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { AppRoutes } from "../utils/router";

const problem = (id: number, name: string, slug: string, difficulty: string, extra: object = {}) => ({
    id,
    name,
    slug,
    difficulty,
    description: "d",
    input_format: "",
    output_format: "",
    constraints: "",
    examples: [],
    status: "new",
    acceptance_rate: null,
    best_runtime_ms: null,
    ...extra,
});

const questions = [
    problem(1, "Sum of Two Numbers", "sum-of-two-numbers", "light", { status: "solved", acceptance_rate: 92.4, best_runtime_ms: 16 }),
    problem(2, "Reverse a String", "reverse-a-string", "medium", { status: "attempted", acceptance_rate: 50 }),
    problem(3, "Nth Fibonacci", "nth-fibonacci", "dark"),
];

const me = {
    username: "alice",
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

const sub = (id: number, extra: object = {}) => ({
    id,
    user: "alice",
    problem: "Sum of Two Numbers",
    problem_slug: "sum-of-two-numbers",
    question: 1,
    verdict: "Accepted",
    submission_time: "2026-10-29T10:00:00Z",
    language: "cpp",
    passed: 3,
    total: 3,
    runtime_ms: 16,
    ...extra,
});

let calls: string[] = [];

function mockApi(opts: { token?: boolean; submissions?: (url: string) => unknown[] } = {}) {
    localStorage.clear();
    if (opts.token) localStorage.setItem("token", "t0k3n");
    calls = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
            calls.push(url);
            const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
            if (url.includes("/accounts/test_token")) return json({ tag: true, username: "alice" });
            if (url.includes("/api/me/")) return json(me);
            if (url.includes("/api/submissions/")) return json(opts.submissions ? opts.submissions(url) : [sub(7)]);
            return json(questions);
        }),
    );
}

function Where() {
    return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderAt(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
            <Where />
        </MemoryRouter>,
    );
}

beforeEach(() => mockApi());
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("app shell", () => {
    it("offers login when logged out, with no dead # links", async () => {
        renderAt("/problems");
        await screen.findByText("Nth Fibonacci");
        expect(screen.getByRole("link", { name: "Log in / Register" })).toHaveAttribute("href", "/signup");
        expect(screen.getByRole("link", { name: "Problems" })).toHaveAttribute("href", "/problems");
        expect(screen.getByRole("link", { name: "Submissions" })).toHaveAttribute("href", "/submissions");
        expect(document.querySelectorAll('a[href="#"]')).toHaveLength(0);
    });

    it("shows the account when logged in", async () => {
        mockApi({ token: true });
        renderAt("/problems");
        expect(await screen.findByRole("button", { name: "Account: alice" })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Log in / Register" })).not.toBeInTheDocument();
    });

    it("includes the theme switch", async () => {
        renderAt("/submissions");
        expect(await screen.findByRole("switch")).toBeInTheDocument();
    });
});

describe("problems screen", () => {
    it("shows the finding line, counts and rows with slug links", async () => {
        mockApi({ token: true });
        renderAt("/problems");
        expect(await screen.findByText(/1 of 3 brewed/)).toHaveTextContent("1 of 3 brewed · Nth Fibonacci untouched");
        const row = screen.getByRole("link", { name: "Sum of Two Numbers" });
        expect(row).toHaveAttribute("href", "/problems/sum-of-two-numbers");
        const tr = row.closest("tr")!;
        expect(within(tr).getByText("92.4%")).toBeInTheDocument();
        expect(within(tr).getByText("0.016 s")).toBeInTheDocument();
        expect(within(tr).getByText("Light roast")).toBeInTheDocument();
        // unknown values are dashes
        expect(within(screen.getByRole("link", { name: "Nth Fibonacci" }).closest("tr")!).getAllByText("—")).toHaveLength(2);
        expect(screen.getByRole("link", { name: "Continue Reverse a String" })).toHaveAttribute("href", "/problems/reverse-a-string");
    });

    it("filters by tab and search", async () => {
        const user = userEvent.setup();
        mockApi({ token: true });
        renderAt("/problems");
        await screen.findByText("Nth Fibonacci");

        await user.click(screen.getByRole("tab", { name: /Solved/ }));
        expect(screen.getByRole("link", { name: "Sum of Two Numbers" })).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Nth Fibonacci" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("tab", { name: /To brew/ }));
        expect(screen.queryByRole("link", { name: "Sum of Two Numbers" })).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Reverse a String" })).toBeInTheDocument();

        await user.click(screen.getByRole("tab", { name: /All/ }));
        await user.type(screen.getByRole("searchbox", { name: "Search problems" }), "fib");
        expect(within(screen.getByRole("table")).getAllByRole("link")).toHaveLength(1);
        await user.clear(screen.getByRole("searchbox", { name: "Search problems" }));
        await user.type(screen.getByRole("searchbox", { name: "Search problems" }), "zzz");
        expect(screen.getByText("No problems match those filters.")).toBeInTheDocument();
    });

    it("sorts by acceptance with unknown values last", async () => {
        const user = userEvent.setup();
        renderAt("/problems");
        await screen.findByText("Nth Fibonacci");
        const names = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("link")[0].textContent);
        expect(names()).toEqual(["Sum of Two Numbers", "Reverse a String", "Nth Fibonacci"]);
        await user.click(screen.getByRole("button", { name: "Acceptance" }));
        expect(names()).toEqual(["Sum of Two Numbers", "Reverse a String", "Nth Fibonacci"]); // desc first
        await user.click(screen.getByRole("button", { name: "Acceptance" }));
        expect(names()).toEqual(["Reverse a String", "Sum of Two Numbers", "Nth Fibonacci"]); // asc, unknown last
        expect(screen.getByRole("columnheader", { name: "Acceptance" })).toHaveAttribute("aria-sort", "ascending");
    });

    it("keeps the old numeric URL working by redirecting to the slug", async () => {
        mockApi({ token: true });
        renderAt("/problems/2");
        await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/problems/reverse-a-string"));
    });
});

describe("submissions screen", () => {
    it("lists Everyone when logged out, with verdict pill, tests and runtime", async () => {
        mockApi({ submissions: () => [sub(7), sub(6, { verdict: "Wrong Answer on tc 2", passed: 1, runtime_ms: null, user: "bob" })] });
        renderAt("/submissions");
        expect(await screen.findByText("#7")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Everyone" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByText("Accepted")).toBeInTheDocument();
        const wrong = screen.getByText("Wrong Answer on tc 2");
        const tr = wrong.closest("tr")!;
        expect(within(tr).getByText("1/3")).toBeInTheDocument();
        expect(within(tr).getByText("—")).toBeInTheDocument(); // unknown runtime
        expect(within(tr).getByText("bob")).toBeInTheDocument();
        expect(within(tr).getByText("C++")).toBeInTheDocument();
    });

    it("defaults to Mine when logged in and asks the API for mine=1", async () => {
        mockApi({ token: true });
        renderAt("/submissions");
        await screen.findByText("#7");
        expect(screen.getByRole("tab", { name: "Mine" })).toHaveAttribute("aria-selected", "true");
        expect(calls.some((c) => c.includes("/api/submissions/") && c.includes("mine=1"))).toBe(true);
    });

    it("sorts by submission number", async () => {
        const user = userEvent.setup();
        mockApi({ submissions: () => [sub(7), sub(9), sub(8)] });
        renderAt("/submissions");
        await screen.findByText("#9");
        const ids = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
        await user.click(screen.getByRole("button", { name: "Submission" }));
        expect(ids()).toEqual(["#9", "#8", "#7"]);
        await user.click(screen.getByRole("button", { name: "Submission" }));
        expect(ids()).toEqual(["#7", "#8", "#9"]);
    });

    it("pages 50 at a time with Load more", async () => {
        const user = userEvent.setup();
        const all = Array.from({ length: 70 }, (_, i) => sub(70 - i));
        mockApi({
            submissions: (url) => {
                const offset = Number(new URL(url).searchParams.get("offset") ?? 0);
                return all.slice(offset, offset + 50);
            },
        });
        renderAt("/submissions");
        await screen.findByText("#70");
        expect(screen.getAllByRole("row")).toHaveLength(51); // header + 50
        await user.click(screen.getByRole("button", { name: "Load more" }));
        await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(71));
        expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    });

    it("asks a logged-out visitor to log in on the Mine tab", async () => {
        const user = userEvent.setup();
        renderAt("/submissions");
        await screen.findByText("#7");
        await user.click(screen.getByRole("tab", { name: "Mine" }));
        expect(screen.getByText(/to see your own submissions/)).toBeInTheDocument();
    });
});
