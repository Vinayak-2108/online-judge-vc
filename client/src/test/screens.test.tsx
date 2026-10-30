import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calls, mockApi, problem, questions, renderAt, sub } from "./api";
import { findingLine } from "../pages/ProblemsList";
import { pendingFailure, submissionsSentence } from "../pages/Submissions";
import { relativeTime, runtimeFor, verdictShort } from "../lib/format";
import type { Submission } from "../types";

beforeEach(() => mockApi());
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("app shell", () => {
    it("offers login when logged out, with no dead # links", async () => {
        renderAt("/problems");
        await screen.findByText("Nth Fibonacci");
        expect(screen.getByRole("link", { name: "Log in / Register" })).toHaveAttribute("href", "/signin");
        expect(screen.getByRole("link", { name: "Problems" })).toHaveAttribute("href", "/problems");
        expect(screen.getByRole("link", { name: "Submissions" })).toHaveAttribute("href", "/submissions");
        expect(document.querySelectorAll('a[href="#"]')).toHaveLength(0);
    });

    it("shows username, email and a logout button when logged in, and logs out", async () => {
        const user = userEvent.setup();
        mockApi({ token: true });
        renderAt("/problems");
        expect(await screen.findByText("alice@school.edu")).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Log in / Register" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Log out" }));
        await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/signin"));
        expect(localStorage.getItem("token")).toBeNull();
    });

    it("has the theme switch in the top bar", async () => {
        renderAt("/submissions");
        expect(await screen.findByRole("switch")).toBeInTheDocument();
    });

    it("searches problems and jumps with the keyboard; Ctrl+K focuses the field", async () => {
        const user = userEvent.setup();
        renderAt("/problems");
        await screen.findByText("Nth Fibonacci");
        await user.keyboard("{Control>}k{/Control}");
        const box = screen.getByRole("combobox", { name: "Search problems" });
        await waitFor(() => expect(box).toHaveFocus());
        await user.type(box, "fib");
        const options = await screen.findAllByRole("option");
        expect(options).toHaveLength(1);
        await user.keyboard("{Enter}");
        await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/problems/nth-fibonacci"));
    });

    it("shows a not-found state for an unknown page", async () => {
        renderAt("/nowhere");
        expect(await screen.findByText("That page is not on the menu.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to Problems" })).toHaveAttribute("href", "/problems");
    });
});

describe("problems screen", () => {
    it("shows the finding sentence, tiles and rows with slug links", async () => {
        mockApi({ token: true });
        renderAt("/problems");
        expect(await screen.findByText(/brewed\./)).toHaveTextContent("1 of 3 brewed. No dark roasts yet: Nth Fibonacci is the only one.");
        const row = screen.getByRole("link", { name: "Sum of Two Numbers" });
        expect(row).toHaveAttribute("href", "/problems/sum-of-two-numbers");
        const tr = row.closest("tr")!;
        expect(within(tr).getByText("92.4%")).toBeInTheDocument();
        expect(within(tr).getByText("0.016 s")).toBeInTheDocument();
        expect(within(tr).getByText("Light roast")).toBeInTheDocument();
        // unknown values are one dash each, and rows share one height class
        const fib = screen.getByRole("link", { name: "Nth Fibonacci" }).closest("tr")!;
        expect(within(fib).getAllByText("—")).toHaveLength(2);
        expect(tr.className).toContain("h-12");
        expect(fib.className).toContain("h-12");
        expect(within(screen.getByRole("group", { name: "Brewed by roast" })).getByText("All roasts")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Continue Reverse a String" })).toHaveAttribute("href", "/problems/reverse-a-string");
        expect(screen.getByRole("button", { name: "Random problem" })).toBeInTheDocument();
        expect(screen.getByText(/3 problems/)).toHaveTextContent("3 problems · Sorted by acceptance, high to low");
    });

    it("builds finding sentences for the other states", () => {
        const qs = questions as never[];
        expect(findingLine(qs, null, false)).toMatch(/^3 problems on the menu\. Log in/);
        const none = qs.map((q: object) => ({ ...q, status: "new" })) as never[];
        expect(findingLine(none, { solved: 0, total: 3, by_roast: { light: { solved: 0, attempted: 0, total: 1 }, medium: { solved: 0, attempted: 0, total: 1 }, dark: { solved: 0, attempted: 0, total: 1 } } } as never, true)).toBe(
            "0 of 3 brewed. Start with Sum of Two Numbers (92.4% accepted).",
        );
        const phone = findingLine(
            [problem(1, "A", "a", "dark", { acceptance_rate: 46.3 }), problem(2, "B", "b", "dark", { acceptance_rate: 30 }), problem(3, "C", "c", "light", { status: "solved" })] as never[],
            null,
            true,
            true,
        );
        expect(phone).toBe("1 of 3 brewed. No dark roasts yet: A is the friendliest of the two (46.3%).");
    });

    it("shows eight rows and then Show all N", async () => {
        const user = userEvent.setup();
        const many = Array.from({ length: 10 }, (_, i) => problem(i + 1, `Problem ${i + 1}`, `p-${i + 1}`, "light", { acceptance_rate: 90 - i }));
        mockApi({ questions: many });
        renderAt("/problems");
        await screen.findByText("Problem 1");
        expect(screen.getAllByRole("row")).toHaveLength(9); // header + 8
        await user.click(screen.getByRole("button", { name: /Show all 10/ }));
        expect(screen.getAllByRole("row")).toHaveLength(11);
        expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
    });

    it("filters by tab and name", async () => {
        const user = userEvent.setup();
        mockApi({ token: true });
        renderAt("/problems");
        await screen.findByText("Nth Fibonacci");
        const links = () => within(screen.getByRole("table")).getAllByRole("link");

        await user.click(screen.getByRole("tab", { name: /Solved/ }));
        expect(links()).toHaveLength(1);
        await user.click(screen.getByRole("tab", { name: /To brew/ }));
        expect(links()).toHaveLength(2);
        await user.click(screen.getByRole("tab", { name: /All/ }));

        const box = screen.getByRole("searchbox", { name: "Filter by name" });
        await user.type(box, "fib");
        expect(links()).toHaveLength(1);
        await user.clear(box);
        await user.type(box, "zzz");
        expect(screen.getByText("No problems match those filters.")).toBeInTheDocument();
    });

    it("sorts by acceptance (high to low by default) with unknown values last", async () => {
        const user = userEvent.setup();
        renderAt("/problems");
        await screen.findByText("Nth Fibonacci");
        const names = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("link")[0].textContent);
        expect(names()).toEqual(["Sum of Two Numbers", "Reverse a String", "Nth Fibonacci"]);
        expect(screen.getByRole("columnheader", { name: "Acceptance" })).toHaveAttribute("aria-sort", "descending");
        await user.click(screen.getByRole("button", { name: "Acceptance" }));
        expect(names()).toEqual(["Reverse a String", "Sum of Two Numbers", "Nth Fibonacci"]);
        expect(screen.getByText(/Sorted by acceptance, low to high/)).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Problem" }));
        expect(names()).toEqual(["Nth Fibonacci", "Reverse a String", "Sum of Two Numbers"]);
    });
});

describe("submissions screen", () => {
    it("lists Everyone when logged out, with short pills, tooltips, tests and runtimes", async () => {
        mockApi({
            submissions: () => [
                sub(7),
                sub(6, { verdict: "Wrong Answer on tc 2", passed: 1, runtime_ms: 31, user: "bob" }),
                sub(5, { verdict: "Time Limit Exceeded on tc 1", passed: 0, runtime_ms: 5012 }),
                sub(4, { verdict: "Compilation Error", passed: 0, runtime_ms: null, language: "cpp" }),
            ],
        });
        renderAt("/submissions");
        expect(await screen.findByText("#7")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /Everyone/ })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: /Everyone/ })).toHaveTextContent("Everyone 214");
        expect(screen.getByRole("tab", { name: /Mine/ })).toHaveTextContent("Mine");

        const wrong = screen.getByText("Wrong answer");
        expect(wrong).toHaveAttribute("title", "Wrong Answer on tc 2");
        const tr = wrong.closest("tr")!;
        expect(within(tr).getByText("1/3")).toBeInTheDocument();
        expect(within(tr).getByText("0.031 s")).toBeInTheDocument();
        expect(within(tr).getByText("bob")).toBeInTheDocument();
        expect(within(screen.getByText("Time limit").closest("tr")!).getByText("> 5.000 s")).toBeInTheDocument();
        const ce = screen.getByText("Compile error").closest("tr")!;
        expect(within(ce).getByText("—")).toBeInTheDocument();
        expect(within(ce).getByText("C++ (GCC 9.2)")).toBeInTheDocument();
        expect(screen.getByText("Accepted")).toBeInTheDocument();
        expect(screen.getByText(/4 submissions in the last 7 days · Newest first/)).toBeInTheDocument();
    });

    it("filters by verdict and language", async () => {
        const user = userEvent.setup();
        mockApi({ submissions: () => [sub(7), sub(6, { verdict: "Wrong Answer on tc 2", language: "cpp" })] });
        renderAt("/submissions");
        await screen.findByText("#7");
        await user.click(screen.getByRole("combobox", { name: "Filter by language" }));
        await user.click(await screen.findByRole("option", { name: "C++ (GCC 9.2)" }));
        expect(screen.queryByText("#7")).not.toBeInTheDocument();
        expect(screen.getByText("#6")).toBeInTheDocument();
    });

    it("defaults to Mine when logged in, with a sentence and a Retry button", async () => {
        const mins = (n: number) => new Date(Date.now() - n * 60000).toISOString();
        mockApi({
            token: true,
            submissions: () => [
                sub(9, { verdict: "Wrong Answer on tc 5", problem: "Balanced Brackets", problem_slug: "balanced-brackets", question: 8, submission_time: mins(12) }),
                sub(8, { verdict: "Time Limit Exceeded on tc 5", problem: "Balanced Brackets", problem_slug: "balanced-brackets", question: 8, submission_time: mins(25) }),
                sub(7, { submission_time: mins(60) }),
            ],
        });
        renderAt("/submissions");
        await screen.findByText("#9");
        expect(screen.getByRole("tab", { name: /Mine/ })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: /Mine/ })).toHaveTextContent("Mine 9");
        expect(screen.getByText(/This week: 3 submissions, 1 accepted\./)).toHaveTextContent(
            "Balanced Brackets failed twice in the last 25 minutes; the earlier run hit the 5 s time limit.",
        );
        expect(screen.getByRole("link", { name: "Retry Balanced Brackets" })).toHaveAttribute("href", "/problems/balanced-brackets");
        expect(calls.some((c) => c.url.includes("/api/submissions/") && c.url.includes("mine=1"))).toBe(true);
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
        expect(screen.getAllByRole("row")).toHaveLength(51);
        await user.click(screen.getByRole("button", { name: "Load more" }));
        await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(71));
        expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    });

    it("asks a logged-out visitor to log in on the Mine tab", async () => {
        const user = userEvent.setup();
        renderAt("/submissions");
        await screen.findByText("#7");
        await user.click(screen.getByRole("tab", { name: /Mine/ }));
        expect(screen.getByText(/to see your own submissions/)).toBeInTheDocument();
    });
});

describe("formatting and sentences", () => {
    const now = new Date(2026, 9, 29, 22, 0); // Thu 29 Oct 2026, 22:00 local
    const at = (daysAgo: number, h: number, m: number) => new Date(2026, 9, 29 - daysAgo, h, m).toISOString();

    it("writes relative times", () => {
        expect(relativeTime(new Date(now.getTime() - 12 * 60000).toISOString(), now)).toBe("12 min ago");
        expect(relativeTime(new Date(now.getTime() - 90 * 60000).toISOString(), now)).toBe("1 h ago");
        expect(relativeTime(at(1, 21, 40), now)).toBe("Yesterday 21:40");
        expect(relativeTime(at(3, 19, 12), now)).toBe("Mon 19:12");
        expect(relativeTime(at(10, 8, 5), now)).toBe("Oct 19, 08:05");
    });

    it("shortens verdicts and runtimes", () => {
        expect(verdictShort("Runtime Error on tc 3")).toBe("Runtime error");
        expect(runtimeFor("Time Limit Exceeded on tc 1", 5010)).toBe("> 5.000 s");
        expect(runtimeFor("Compilation Error", null)).toBe("—");
        expect(runtimeFor("Accepted", 16)).toBe("0.016 s");
    });

    it("finds the outstanding failure and writes the week sentence", () => {
        const s = (id: number, verdict: string, question: number, when: string) =>
            ({ ...sub(id, { verdict, question, problem: `P${question}`, submission_time: when }) }) as unknown as Submission;
        const rows = [
            s(3, "Accepted", 2, at(0, 21, 0)),
            s(2, "Wrong Answer on tc 4", 1, at(0, 21, 30)),
            s(1, "Compilation Error", 1, at(0, 21, 40)),
        ];
        expect(pendingFailure(rows)?.latest.id).toBe(1);
        expect(submissionsSentence(rows, now)).toBe("This week: 3 submissions, 1 accepted. P1 failed twice in the last 30 minutes; the earlier run gave a wrong answer on test 4.");
        // accepted afterwards: nothing outstanding
        expect(pendingFailure([...rows, s(4, "Accepted", 1, at(0, 21, 50))])).toBeNull();
        expect(submissionsSentence([], now)).toMatch(/^No submissions in the last 7 days/);
    });
});
