import { Outlet, useMatch } from "react-router";

import { Account, MenuSheet, NavLinks } from "./MenuSheet";
import ProblemSearch from "./ProblemSearch";
import ThemeToggle from "./ThemeToggle";
import Wordmark from "./Wordmark";

/**
 * Framed-sheet shell: a full-width top bar and a sidebar on one tinted frame, the work on a white
 * sheet inset 8px from the right and bottom, 16px corners, a hairline edge, no shadow.
 * Under md: a top bar with a menu sheet and a search button.
 */
const AppShell = () => {
    // The phone workspace brings its own header (back arrow, title, roast).
    const inWorkspace = !!useMatch("/problems/:slug");

    return (
        <div className="flex min-h-dvh flex-col bg-frame text-foreground md:h-dvh">
            <header className="relative hidden h-[49px] shrink-0 items-center justify-between px-[18px] md:flex">
                <Wordmark className="text-[18px]" />
                {/* centred over the sheet (from the sidebar's edge to the right inset), as in the frame */}
                <div className="pointer-events-none absolute inset-y-0 right-[150px] left-[229px] lg:right-2 flex items-center justify-center px-4">
                    <div className="pointer-events-auto w-full max-w-[439px]">
                        <ProblemSearch variant="bar" />
                    </div>
                </div>
                <div className="relative z-10 flex justify-end pr-[29px] text-foreground">
                    <ThemeToggle />
                </div>
            </header>

            <header className={`flex h-12 shrink-0 items-center gap-1 px-1 md:hidden ${inWorkspace ? "max-md:hidden" : ""}`}>
                <MenuSheet />
                <Wordmark className="ml-1 flex-1 text-[16px]" />
                <ProblemSearch variant="icon" />
            </header>

            <div className="flex min-h-0 flex-1">
                <aside className="hidden w-[229px] shrink-0 flex-col justify-between pt-3 pr-[9px] pb-3 pl-2 md:flex" aria-label="Sidebar">
                    <NavLinks />
                    <Account />
                </aside>
                <main
                    className={`min-h-0 min-w-0 flex-1 overflow-y-auto bg-sheet md:mr-2 md:mb-2 md:rounded-sheet md:border md:border-border ${
                        inWorkspace ? "" : "border-t border-border"
                    } ${inWorkspace ? "max-md:border-0" : ""}`}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppShell;
