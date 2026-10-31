import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ThemeToggle from "../components/ThemeToggle";
import { tokens } from "../lib/tokens";

beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "light";
});
afterEach(cleanup);

describe("ThemeToggle", () => {
    it("switches data-theme and remembers the choice", async () => {
        const user = userEvent.setup();
        render(<ThemeToggle />);
        const toggle = screen.getByRole("switch");
        expect(toggle).toHaveAttribute("aria-checked", "false");

        await user.click(toggle);
        expect(document.documentElement.dataset.theme).toBe("dark");
        expect(localStorage.getItem("theme")).toBe("dark");
        expect(toggle).toHaveAttribute("aria-checked", "true");

        await user.click(screen.getByRole("button", { name: "Light theme" }));
        expect(document.documentElement.dataset.theme).toBe("light");
        expect(localStorage.getItem("theme")).toBe("light");
    });

    it("keeps working when storage is blocked", async () => {
        const user = userEvent.setup();
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = () => {
            throw new Error("blocked");
        };
        try {
            render(<ThemeToggle />);
            await user.click(screen.getByRole("switch"));
            expect(document.documentElement.dataset.theme).toBe("dark");
        } finally {
            Storage.prototype.setItem = original;
        }
    });
});

describe("tokens", () => {
    it("tokens.ts matches the CSS variables for both themes", () => {
        const css = readFileSync(resolve(process.cwd(), "src/styles/index.css"), "utf8");
        const block = (selector: string) => {
            const start = css.indexOf(selector);
            return css.slice(start, css.indexOf("}", start));
        };
        const read = (body: string) =>
            Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2].toLowerCase()]));
        expect(read(block(':root[data-theme="light"]'))).toEqual(tokens.light);
        expect(read(block(':root[data-theme="dark"]'))).toEqual(tokens.dark);
    });
});
