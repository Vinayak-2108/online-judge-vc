import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { calls, mockApi, renderAt } from "./api";
import { safeNext, usernameSuggestions } from "../pages/SignIn";

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const password = () => document.getElementById("password") as HTMLInputElement;

describe("sign in", () => {
    it("shows inline errors for empty fields instead of alerts", async () => {
        const user = userEvent.setup();
        const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
        mockApi();
        renderAt("/signin");
        await user.click(await screen.findByRole("button", { name: "Sign in" }));
        expect(screen.getByText("Enter a username.")).toBeInTheDocument();
        expect(screen.getByText("Enter your password.")).toBeInTheDocument();
        expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
        expect(screen.getByLabelText("Username")).toHaveAttribute("aria-describedby", "username-error");
        expect(alert).not.toHaveBeenCalled();
    });

    it("shows a server error inline on a wrong password", async () => {
        const user = userEvent.setup();
        mockApi({ post: { "/accounts/login": { status: 400, body: { error: "Invalid username or password" } } } });
        renderAt("/signin");
        await user.type(screen.getByLabelText("Username"), "riya_s");
        await user.type(password(), "nope-nope");
        await user.click(screen.getByRole("button", { name: "Sign in" }));
        const msg = await screen.findByText("Invalid username or password");
        expect(msg).toHaveAttribute("role", "alert");
        expect(password()).toHaveAttribute("aria-describedby", "password-error");
        expect(localStorage.getItem("token")).toBeNull();
    });

    it("signs in, stores the token and goes to /problems", async () => {
        const user = userEvent.setup();
        mockApi({ post: { "/accounts/login": { body: { tag: true, token: "abc123", user: { username: "alice" } } } } });
        renderAt("/signin");
        await user.type(screen.getByLabelText("Username"), "alice");
        await user.type(password(), "Brew-1234-coffee");
        await user.click(screen.getByRole("button", { name: "Sign in" }));
        await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/problems"));
        expect(localStorage.getItem("token")).toBe("abc123");
        expect(await screen.findByText("alice@school.edu")).toBeInTheDocument();
    });

    it("reveals and hides the password", async () => {
        const user = userEvent.setup();
        mockApi();
        renderAt("/signin");
        expect(password().type).toBe("password");
        await user.click(screen.getByRole("button", { name: "Show password" }));
        expect(password().type).toBe("text");
        expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    });

    it("swaps to the sign-up form and back", async () => {
        const user = userEvent.setup();
        mockApi();
        renderAt("/signin");
        await user.click(screen.getByRole("link", { name: "Create an account" }));
        expect(screen.getByRole("heading", { name: "Open a tab" })).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByText("At least 8 characters, not only numbers, not a common password.")).toBeInTheDocument();
        await user.click(screen.getByRole("link", { name: "Sign in" }));
        expect(screen.getByRole("heading", { name: "Welcome back to the counter" })).toBeInTheDocument();
    });
});

describe("sign up", () => {
    it("checks the password rules before calling the server", async () => {
        const user = userEvent.setup();
        mockApi();
        renderAt("/signup");
        await user.type(screen.getByLabelText("Username"), "riya_s");
        await user.type(screen.getByLabelText("Email"), "riya.sen@school.edu");
        await user.type(password(), "hunter");
        await user.click(screen.getByRole("button", { name: "Create account" }));
        expect(
            screen.getByText("At least 8 characters, not only numbers, not a common password. This one is 6 characters."),
        ).toBeInTheDocument();
        expect(calls.some((c) => c.url.endsWith("/accounts/signup"))).toBe(false);
    });

    it("shows the server field errors inline", async () => {
        const user = userEvent.setup();
        mockApi({
            post: {
                "/accounts/signup": {
                    status: 400,
                    body: { username: ["This field must be unique."], email: ["Enter a valid email address."], password: ["This password is too common."] },
                },
            },
        });
        renderAt("/signin?mode=signup");
        await user.type(screen.getByLabelText("Username"), "riya_s");
        await user.type(screen.getByLabelText("Email"), "riya.sen@school.edu");
        await user.type(password(), "password1");
        await user.click(screen.getByRole("button", { name: "Create account" }));
        expect(await screen.findByText("That username is taken. Try riya_s2 or riya.sen.")).toBeInTheDocument();
        expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
        expect(screen.getByText("This password is too common.")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toHaveAttribute("aria-describedby", "email-error");
    });

    it("creates the account, logs in and goes to /problems", async () => {
        const user = userEvent.setup();
        mockApi({ post: { "/accounts/signup": { status: 201, body: { token: "newtok", message: "User Created", user: { username: "riya_s" } } } } });
        renderAt("/signup");
        await user.type(screen.getByLabelText("Username"), "riya_s");
        await user.type(screen.getByLabelText("Email"), "riya.sen@school.edu");
        await user.type(password(), "Brew-1234-coffee");
        await user.click(screen.getByRole("button", { name: "Create account" }));
        await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/problems"));
        expect(localStorage.getItem("token")).toBe("newtok");
        expect(calls.find((c) => c.url.endsWith("/accounts/signup"))!.body).toEqual({
            username: "riya_s",
            email: "riya.sen@school.edu",
            password: "Brew-1234-coffee",
        });
    });
});


describe("sign-in behaviour", () => {
    it("moves focus to the first invalid field", async () => {
        const user = userEvent.setup();
        mockApi();
        renderAt("/signin?mode=signup");
        await user.type(screen.getByLabelText("Username"), "riya_s");
        await user.click(screen.getByRole("button", { name: "Create account" }));
        await waitFor(() => expect(screen.getByLabelText("Email")).toHaveFocus());
        await user.type(screen.getByLabelText("Email"), "riya.sen@school.edu");
        await user.click(screen.getByRole("button", { name: "Create account" }));
        await waitFor(() => expect(password()).toHaveFocus());
    });

    it("goes back to where the visitor was after signing in", async () => {
        const user = userEvent.setup();
        mockApi({ post: { "/accounts/login": { body: { tag: true, token: "abc", user: { username: "alice" } } } } });
        renderAt("/signin?next=%2Fproblems%2Fsum-of-two-numbers");
        await user.type(screen.getByLabelText("Username"), "alice");
        await user.type(password(), "Brew-1234-coffee");
        await user.click(screen.getByRole("button", { name: "Sign in" }));
        await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/problems/sum-of-two-numbers"));
    });

    it("sends a signed-in visitor on to /problems", async () => {
        mockApi({ token: true });
        renderAt("/signin");
        await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/problems"));
        expect(screen.queryByRole("heading", { name: "Welcome back to the counter" })).not.toBeInTheDocument();
    });

    it("only follows same-site next paths and suggests two usernames", () => {
        expect(safeNext("/problems/x")).toBe("/problems/x");
        expect(safeNext("//evil.test")).toBe("/problems");
        expect(safeNext("https://evil.test")).toBe("/problems");
        expect(safeNext(null)).toBe("/problems");
        expect(usernameSuggestions("riya_s", "riya.sen@school.edu")).toEqual(["riya_s2", "riya.sen"]);
        expect(usernameSuggestions("riya", "riya@school.edu")).toEqual(["riya2", "riya.1"]);
    });
});
