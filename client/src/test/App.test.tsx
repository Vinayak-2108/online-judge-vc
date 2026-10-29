import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "../utils/router";

const questions = [
    { id: 1, name: "Sum of Two Numbers", difficulty: "Easy", description: "Add." },
    { id: 2, name: "Nth Fibonacci", difficulty: "Medium", description: "Fib." },
    { id: 3, name: "Median of Arrays", difficulty: "Hard", description: "Median." },
];

const submissions = [
    {
        id: 1,
        user: "alice",
        problem: "Sum of Two Numbers",
        verdict: "Accepted",
        submission_time: "2026-01-01T10:00:00Z",
        language: "cpp",
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
            const body = url.includes("/submissions/") ? submissions : questions;
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
        renderAt("/signup");
        expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    });

    it("lists problems from a mocked API", async () => {
        renderAt("/problems");
        expect(await screen.findByText("Sum of Two Numbers")).toBeInTheDocument();
        expect(screen.getByText("Nth Fibonacci")).toBeInTheDocument();
        expect(screen.getByText("Median of Arrays")).toBeInTheDocument();
    });

    it("lists submissions from a mocked API", async () => {
        renderAt("/submissions");
        expect(await screen.findByText("alice")).toBeInTheDocument();
        expect(screen.getByText("Accepted")).toBeInTheDocument();
    });
});
