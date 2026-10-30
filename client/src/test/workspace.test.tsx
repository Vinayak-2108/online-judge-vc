import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calls, mockApi, renderAt, sub } from "./api";

// CodeMirror needs real layout; a textarea stands in for it here.
vi.mock("@uiw/react-codemirror", () => ({
    default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <textarea aria-label="Code editor" value={value} onChange={(e) => onChange(e.target.value)} />
    ),
}));

const DRAFT = "cc:draft:sum-of-two-numbers:py";

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("workspace", () => {
    beforeEach(() => mockApi({ token: true }));

    it("shows the statement from the backend fields", async () => {
        renderAt("/problems/sum-of-two-numbers");
        expect(await screen.findByRole("heading", { name: "Sum of Two Numbers", level: 1 })).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("ProblemsSum of Two Numbers");
        expect(screen.getByText("Solved · your best 0.016 s")).toBeInTheDocument();
        expect(screen.getByText("Light roast")).toBeInTheDocument();
        expect(screen.getByText("92.4% accepted")).toBeInTheDocument();
        expect(screen.getByText("3 test cases")).toBeInTheDocument();
        for (const heading of ["Input", "Output", "Examples", "Constraints"]) {
            expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
        }
        expect(screen.getAllByTestId("example")).toHaveLength(2);
        expect(screen.getByText("Time limit 5 s per test case")).toBeInTheDocument();
        expect(screen.getByRole("combobox", { name: "Language" })).toHaveTextContent("Python 3.8");
        expect(screen.getByRole("textbox", { name: "Custom input" })).toHaveValue("2 3");
    });

    it("lists this problem's submissions in the My submissions tab", async () => {
        const user = userEvent.setup();
        mockApi({
            token: true,
            submissions: () => [sub(8), sub(7, { verdict: "Wrong Answer on tc 1", passed: 0 }), sub(6, { problem_slug: "other", problem: "Other" })],
        });
        renderAt("/problems/sum-of-two-numbers");
        const tab = await screen.findByRole("tab", { name: /My submissions/ });
        await waitFor(() => expect(tab).toHaveTextContent("My submissions 2"));
        await user.click(tab);
        expect(screen.getByText("#8")).toBeInTheDocument();
        expect(screen.getByText("Wrong answer")).toBeInTheDocument();
        expect(screen.queryByText("#6")).not.toBeInTheDocument();
    });

    it("saves a draft per problem and language and resets it", async () => {
        const user = userEvent.setup();
        localStorage.setItem(DRAFT, JSON.stringify({ code: "print(1)", at: new Date(2026, 9, 29, 21, 42).getTime() }));
        renderAt("/problems/sum-of-two-numbers");
        const editor = await screen.findByLabelText("Code editor");
        expect(editor).toHaveValue("print(1)");
        expect(screen.getByText("Draft saved 21:42")).toBeInTheDocument();

        await user.type(editor, "2");
        await waitFor(() => expect(JSON.parse(localStorage.getItem(DRAFT)!).code).toBe("print(1)2"), { timeout: 2000 });

        await user.click(screen.getByRole("button", { name: "Reset" }));
        expect(localStorage.getItem(DRAFT)).toBeNull();
        expect((screen.getByLabelText("Code editor") as HTMLTextAreaElement).value).toContain("import sys");
        expect(screen.queryByText(/Draft saved/)).not.toBeInTheDocument();
    });

    it("runs custom input and shows the output with runtime and exit code", async () => {
        const user = userEvent.setup();
        mockApi({ token: true, post: { "/questions/run": { body: { status: "Accepted", output: "5\n", error: "", runtime_ms: 14, exit_code: 0 } } } });
        renderAt("/problems/sum-of-two-numbers");
        await user.click(await screen.findByRole("button", { name: "Run" }));
        expect(await screen.findByText("Ran in 0.014 s · exit code 0")).toBeInTheDocument();
        const run = calls.find((c) => c.url.endsWith("/questions/run"))!;
        expect(run.body).toMatchObject({ lang: "py", input_data: "2 3", problem_id: 1 });
    });

    it("prints the submission ticket after Submit", async () => {
        const user = userEvent.setup();
        mockApi({
            token: true,
            post: { "/questions/submit": { body: { id: 1043, verdict: "Accepted", passed: 3, total: 3, runtime_ms: 16 } } },
        });
        renderAt("/problems/sum-of-two-numbers");
        await user.click(await screen.findByRole("button", { name: "Submit" }));
        const ticket = await screen.findByTestId("ticket");
        expect(ticket).toHaveTextContent("Submission #1043");
        expect(within(ticket).getByText("Accepted")).toBeInTheDocument();
        expect(ticket).toHaveTextContent("3 of 3 tests passed");
        expect(ticket).toHaveTextContent("0.016 s");
        expect(ticket).toHaveTextContent("Python 3.8");
        expect(within(ticket).getByRole("link", { name: /All submissions/ })).toHaveAttribute("href", "/submissions");
    });

    it("toasts server errors instead of alerting", async () => {
        const user = userEvent.setup();
        mockApi({ token: true, post: { "/questions/submit": { status: 503, body: { error: "Judge unavailable, try again later" } } } });
        renderAt("/problems/sum-of-two-numbers");
        await user.click(await screen.findByRole("button", { name: "Submit" }));
        expect(await screen.findByText("Judge unavailable, try again later")).toBeInTheDocument();
        expect(screen.queryByTestId("ticket")).not.toBeInTheDocument();
    });

    it("asks a logged-out visitor to log in before running", async () => {
        const user = userEvent.setup();
        mockApi();
        renderAt("/problems/sum-of-two-numbers");
        await user.click(await screen.findByRole("button", { name: "Run" }));
        expect(await screen.findByText("Log in to run and submit code.")).toBeInTheDocument();
        expect(calls.some((c) => c.url.endsWith("/questions/run"))).toBe(false);
    });

    it("redirects the old numeric id to the slug", async () => {
        renderAt("/problems/2");
        await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/problems/reverse-a-string"));
    });

    it("shows a not-found state with a way back for an unknown slug", async () => {
        renderAt("/problems/does-not-exist");
        expect(await screen.findByText("That problem is not on the menu.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to Problems" })).toHaveAttribute("href", "/problems");
    });

    it("works when localStorage is unavailable", async () => {
        const user = userEvent.setup();
        renderAt("/problems/sum-of-two-numbers");
        const editor = await screen.findByLabelText("Code editor");
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = () => {
            throw new Error("blocked");
        };
        try {
            await user.type(editor, "x");
            await new Promise((r) => setTimeout(r, 700));
            expect((screen.getByLabelText("Code editor") as HTMLTextAreaElement).value).toContain("x");
        } finally {
            Storage.prototype.setItem = original;
        }
    });
});
