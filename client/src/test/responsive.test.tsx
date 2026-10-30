import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { mockApi, renderAt } from "./api";

/** Pretend the page's root element is `width` px wide. */
function sheetWidth(width: number) {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            constructor(private cb: (e: unknown[]) => void) {}
            observe() {
                this.cb([{ borderBoxSize: [{ inlineSize: width }] }]);
            }
            disconnect() {}
        },
    );
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("layout follows the sheet's width, not the window's", () => {
    it.each([514, 600, 779])("Problems uses two-line rows at %ipx", async (w) => {
        mockApi();
        sheetWidth(w);
        renderAt("/problems");
        const link = await screen.findByRole("link", { name: /Sum of Two Numbers/ });
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/problems/sum-of-two-numbers");
        expect(within(link).getByText(/Light roast/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
    });

    it.each([780, 1024, 1203])("Problems uses the table at %ipx", async (w) => {
        mockApi();
        sheetWidth(w);
        renderAt("/problems");
        await screen.findByRole("table");
        expect(screen.getByRole("columnheader", { name: "Acceptance" })).toBeInTheDocument();
    });

    it("Submissions: list below 780, table without Language up to 1189, every column from 1190", async () => {
        mockApi();
        sheetWidth(514);
        renderAt("/submissions");
        await screen.findByText("#7");
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        cleanup();

        sheetWidth(900);
        renderAt("/submissions");
        await screen.findByRole("table");
        expect(screen.queryByRole("columnheader", { name: "Language" })).not.toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Submitted" })).toBeInTheDocument();
        cleanup();

        sheetWidth(1203);
        renderAt("/submissions");
        await screen.findByRole("table");
        expect(screen.getByRole("columnheader", { name: "Language" })).toBeInTheDocument();
    });
});
