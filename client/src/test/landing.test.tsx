import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calls, mockApi, problem, renderAt, sub } from "./api";
import { pickSlips } from "../pages/Landing";
import type { Submission } from "../types";

const menu = [
    ...["sum-of-two-numbers", "count-the-vowels", "prime-sieve-up-to-n", "second-largest-in-an-array"].map((s, i) => problem(i + 1, s.replace(/-/g, " "), s, "light", { acceptance_rate: 90 - i })),
    ...["reverse-a-string", "balanced-brackets", "longest-common-prefix", "merge-two-sorted-lists", "rotate-an-array"].map((s, i) => problem(i + 5, s.replace(/-/g, " "), s, "medium", { acceptance_rate: 70 - i })),
    ...["nth-fibonacci", "coin-change", "longest-increasing-subsequence"].map((s, i) => problem(i + 10, s.replace(/-/g, " "), s, "dark", { acceptance_rate: 46 - i })),
];

const ago = (mins: number) => new Date(Date.now() - mins * 60000).toISOString();

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("landing page", () => {
    it("has every section, the nav, and the photo credits", async () => {
        mockApi({ questions: menu });
        renderAt("/");
        expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(/Solve it while\s*it is still hot/i);
        for (const name of ["How a run works", "On the menu", "Argued over at a table", "Your table is ready", "See you at the counter"]) {
            expect(screen.getByRole("heading", { name })).toBeInTheDocument();
        }
        const nav = screen.getByRole("navigation", { name: "On this page" });
        expect(within(nav).getByRole("link", { name: "How a run works" })).toHaveAttribute("href", "#how");
        expect(within(nav).getByRole("link", { name: "The menu" })).toHaveAttribute("href", "#menu");
        expect(within(nav).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
        const credits = screen.getByText(/© 2026 Code Cafe\. Pictures:/);
        expect(credits).toHaveTextContent("by Chopr");
        expect(credits).toHaveTextContent("CC BY 2.0");
        expect(credits).toHaveTextContent("by James Miller, CC0");
        expect(credits).toHaveTextContent("public domain. All via Wikimedia Commons.");
        for (const img of document.querySelectorAll("img")) {
            expect(img.getAttribute("width")).toBeTruthy();
            expect(img.getAttribute("height")).toBeTruthy();
            expect(img.getAttribute("loading")).toBe("lazy");
        }
    });

    it("computes the menu line from the data and links the open card to its workspace", async () => {
        const user = userEvent.setup();
        mockApi({ questions: menu });
        renderAt("/");
        expect(await screen.findByText(/12 problems on the menu: 4 light, 5 medium, 3 dark roast\./)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "See the full menu" })).toHaveAttribute("href", "/problems");
        const open = screen.getByRole("link", { name: /Sum of Two Numbers|sum of two numbers: solve it/i });
        expect(open).toHaveAttribute("href", "/problems/sum-of-two-numbers");
        // another card opens on click, then it links to its own problem
        await user.click(screen.getByRole("button", { name: /Balanced Brackets|balanced brackets/i }));
        expect(screen.getByRole("link", { name: /balanced brackets: solve it/i })).toHaveAttribute("href", "/problems/balanced-brackets");
    });

    it("shows up to six real recent slips with a mix of verdicts, and copes with fewer", async () => {
        mockApi({
            submissions: () => [
                sub(9, { submission_time: ago(5) }),
                sub(8, { submission_time: ago(8) }),
                sub(7, { submission_time: ago(9) }),
                sub(6, { verdict: "Wrong Answer on tc 2", submission_time: ago(20) }),
                sub(5, { verdict: "Time Limit Exceeded on tc 1", submission_time: ago(30), runtime_ms: 5010 }),
                sub(4, { verdict: "Compilation Error", passed: 0, runtime_ms: null, submission_time: ago(40) }),
                sub(3, { verdict: "Runtime Error on tc 3", runtime_ms: null, submission_time: ago(50) }),
            ],
        });
        renderAt("/");
        await screen.findByText("Submission #9");
        const ids = screen.getAllByText(/^Submission #\d+$/).filter((e) => e.closest(".slip")).map((e) => e.textContent);
        expect(ids).toHaveLength(6);
        // one of each verdict kind is in, even though the newest three were all accepted
        for (const text of ["Wrong answer", "Time limit", "Compile error", "Runtime error"]) {
            expect(within(document.querySelector(".slips") as HTMLElement).getByText(text)).toBeInTheDocument();
        }
        expect(screen.getByText("over 5 s")).toBeInTheDocument();
        cleanup();

        mockApi({ submissions: () => [sub(1)] });
        renderAt("/");
        await screen.findByText("Submission #1");
        expect(document.querySelectorAll(".slip")).toHaveLength(1);
        cleanup();

        mockApi({ submissions: () => [] });
        renderAt("/");
        await screen.findByText(/The first ones will land here\./);
        expect(document.querySelectorAll(".slip")).toHaveLength(0);
    });

    it("picks slips by verdict variety, newest first", () => {
        const rows = [
            sub(5, { submission_time: ago(1) }),
            sub(4, { submission_time: ago(2) }),
            sub(3, { verdict: "Wrong Answer on tc 1", submission_time: ago(3) }),
        ] as unknown as Submission[];
        expect(pickSlips(rows).map((s) => s.id)).toEqual([5, 4, 3]);
    });

    it("adapts the call to action to who is looking", async () => {
        mockApi({ questions: menu });
        renderAt("/");
        const create = await screen.findByRole("link", { name: "Create an account" });
        expect(create).toHaveAttribute("href", "/signin?mode=signup");
        expect(screen.getAllByRole("link", { name: "Sign in" }).some((a) => a.getAttribute("href") === "/signin")).toBe(true);
        cleanup();

        mockApi({ token: true, questions: menu });
        renderAt("/");
        expect(await screen.findByRole("heading", { name: "Back to the counter" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open the problems" })).toHaveAttribute("href", "/problems");
        expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
    });

    it("scrolls the how-a-run row with the arrow buttons", async () => {
        const user = userEvent.setup();
        const scrollBy = vi.fn();
        Object.defineProperty(Element.prototype, "scrollBy", { value: scrollBy, configurable: true });
        mockApi();
        renderAt("/");
        await user.click(await screen.findByRole("button", { name: "Next moment" }));
        expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 312 }));
        await user.click(screen.getByRole("button", { name: "Previous moment" }));
        expect(scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -312 }));
        expect(screen.getByRole("region", { name: /steps of a run/i })).toHaveAttribute("tabindex", "0");
    });
});

describe("the live editor", () => {
    const demoRun = { body: { status: "Accepted", output: "5\n", error: "", runtime_ms: 14, exit_code: 0 } };
    const demoSubmit = { body: { verdict: "Accepted", passed: 3, total: 3, runtime_ms: 16 } };

    it("runs the code on the public demo endpoint with the typed input", async () => {
        const user = userEvent.setup();
        mockApi({ post: { "/demo/run": demoRun } });
        renderAt("/");
        const input = await screen.findByLabelText("Input");
        await user.clear(input);
        await user.type(input, "4 9");
        await user.click(screen.getByRole("button", { name: "Run" }));
        expect(await screen.findByText("Ran in 0.014 s · exit code 0")).toBeInTheDocument();
        const call = calls.find((c) => c.url.endsWith("/api/demo/run"))!;
        expect(call.body).toMatchObject({ lang: "py", input_data: "4 9" });
        expect((call.body as { code: string }).code).toContain("sys.stdin.read()");
    });

    it("prints a slip on Submit with the verdict, tests and runtime, and numbers it from the real tally", async () => {
        const user = userEvent.setup();
        mockApi({ post: { "/demo/submit": demoSubmit } });
        renderAt("/");
        await user.click(await screen.findByRole("button", { name: "Submit" }));
        const live = document.querySelector('[aria-live="polite"]') as HTMLElement;
        await waitFor(() => expect(within(live).getAllByText("Accepted").length).toBeGreaterThan(0));
        expect(live).toHaveTextContent("Submission #215"); // 214 submissions so far
        expect(live).toHaveTextContent("3 of 3 tests");
        expect(live).toHaveTextContent("0.016 s");
        expect(live).toHaveTextContent("Python 3.8");
        expect(calls.some((c) => c.url.endsWith("/api/demo/submit"))).toBe(true);
        expect(calls.every((c) => !c.url.includes("/questions/submit"))).toBe(true);
    });

    it("switches language with the tabs and sends that language", async () => {
        const user = userEvent.setup();
        mockApi({ post: { "/demo/run": demoRun } });
        renderAt("/");
        await user.click(await screen.findByRole("tab", { name: "C++" }));
        expect((screen.getByLabelText(/^Code, C\+\+/) as HTMLTextAreaElement).value).toContain("#include <iostream>");
        await user.click(screen.getByRole("button", { name: "Run" }));
        await screen.findByText("Ran in 0.014 s · exit code 0");
        expect(calls.find((c) => c.url.endsWith("/api/demo/run"))!.body).toMatchObject({ lang: "cpp" });
    });

    it("says so when the throttle says stop", async () => {
        const user = userEvent.setup();
        mockApi({ post: { "/demo/run": { status: 429, body: { detail: "Request was throttled." } } } });
        renderAt("/");
        await user.click(await screen.findByRole("button", { name: "Run" }));
        expect(await screen.findByText(/ten tries a minute/)).toBeInTheDocument();
    });

    it("keeps the slip still when the visitor prefers reduced motion", async () => {
        vi.stubGlobal("matchMedia", (query: string) => ({
            matches: query.includes("prefers-reduced-motion") || query.includes("min-width"),
            media: query,
            addEventListener() {},
            removeEventListener() {},
        }));
        const user = userEvent.setup();
        mockApi({ post: { "/demo/submit": demoSubmit } });
        renderAt("/");
        await user.click(await screen.findByRole("button", { name: "Submit" }));
        expect((await screen.findAllByText("3 of 3 tests")).length).toBeGreaterThan(0);
    });
});
