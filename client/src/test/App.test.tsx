import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "../utils/router";

const questions = [
    { id: 1, name: "Sum of Two Numbers", slug: "sum", difficulty: "light", description: "Add.", examples: [], test_count: 1 },
    { id: 2, name: "Nth Fibonacci", slug: "fib", difficulty: "medium", description: "Fib.", examples: [], test_count: 1 },
    { id: 3, name: "Median of Arrays", slug: "median", difficulty: "dark", description: "Median.", examples: [], test_count: 1 },
];

const submissions = [
    {
        id: 1,
        user: "alice",
        problem: "Sum of Two Numbers",
        verdict: "Accepted",
        submission_time: "2026-01-01T10:00:00Z",
        language: "cpp",
        problem_slug: "sum-of-two-numbers",
        question: 1,
        passed: 3,
        total: 3,
        runtime_ms: 12,
    },
];

function renderAt(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
            const body = url.includes("/submissions/summary/") ? { everyone: 1, mine: null } : url.includes("/submissions/") ? submissions : questions;
            return { ok: true, json: async () => body } as Response;
        }),
    );
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("routes", () => {
    it("renders the landing page", () => {
        renderAt("/");
        expect(screen.getByText("Freshly brewed questions")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Start Brewing" })).toBeInTheDocument();
    });

    it("renders the about page", () => {
        renderAt("/about");
        expect(screen.getByText("About Code Cafe")).toBeInTheDocument();
    });

    it("renders the sign in form", () => {
        renderAt("/signin");
        expect(screen.getByRole("heading", { name: "Welcome back to the counter" })).toBeInTheDocument();
    });

    it("keeps /signup working: it opens the sign-up form", () => {
        renderAt("/signup");
        expect(screen.getByRole("heading", { name: "Open a tab" })).toBeInTheDocument();
    });

    it("lists problems from a mocked API", async () => {
        renderAt("/problems");
        expect(await screen.findByText("Sum of Two Numbers")).toBeInTheDocument();
        expect(screen.getByText("Nth Fibonacci")).toBeInTheDocument();
        expect(screen.getByText("Median of Arrays")).toBeInTheDocument();
    });

    it("lists submissions from a mocked API", async () => {
        renderAt("/submissions");
        expect(await screen.findByText("#1")).toBeInTheDocument();
        expect(screen.getByText("Accepted")).toBeInTheDocument();
    });
});
