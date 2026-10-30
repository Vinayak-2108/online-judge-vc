import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useMatch, useNavigate } from "react-router";
import { ListIcon, LogInIcon, LogOutIcon, MenuIcon, NotebookTextIcon } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ProblemSearch from "./ProblemSearch";
import ThemeToggle from "./ThemeToggle";
import Wordmark from "./Wordmark";
import { useAuth } from "../lib/auth";

const NAV = [
    { to: "/problems", label: "Problems", icon: ListIcon, stroke: 2.75 },
    { to: "/submissions", label: "Submissions", icon: NotebookTextIcon, stroke: 2.25 },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex h-8 items-center gap-3 rounded-card px-[10px] text-[15px] no-underline text-foreground ${
        isActive ? "bg-active font-semibold" : "hover:bg-active/60"
    }`;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <nav aria-label="Main" className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, stroke }) => (
                <NavLink key={to} to={to} className={navClass} onClick={onNavigate}>
                    <Icon className="size-[18px] text-foreground" strokeWidth={stroke} aria-hidden />
                    {label}
                </NavLink>
            ))}
        </nav>
    );
}

/** The sidebar foot: who is signed in, with a logout button; or the way in. */
function Account({ onNavigate }: { onNavigate?: () => void }) {
    const { user, email, ready, logout } = useAuth();
    const navigate = useNavigate();

    if (user) {
        return (
            <div className="flex items-center justify-between gap-2 px-[10px] pb-1">
                <div className="min-w-0 leading-tight">
                    <div className="truncate text-[14px] font-medium text-foreground">{user}</div>
                    {email && <div className="truncate text-[13px] text-muted-ink">{email}</div>}
                </div>
                <button
                    type="button"
                    aria-label="Log out"
                    title="Log out"
                    onClick={async () => {
                        await logout();
                        onNavigate?.();
                        navigate("/signin");
                    }}
                    className="flex size-9 shrink-0 items-center justify-center rounded-control text-foreground hover:bg-active/60"
                >
                    <LogOutIcon className="size-[18px]" strokeWidth={2} aria-hidden />
                </button>
            </div>
        );
    }
    if (!ready) return <div className="h-9" />;
    return (
        <Link
            to="/signin"
            onClick={onNavigate}
            className="flex h-9 items-center justify-center gap-2 rounded-control bg-primary text-[14px] font-medium text-primary-foreground no-underline hover:opacity-90"
        >
            <LogInIcon className="size-4" aria-hidden />
            Log in / Register
        </Link>
    );
}

/**
 * Framed-sheet shell: a full-width top bar and a sidebar on one tinted frame, the work on a white
 * sheet inset 8px from the right and bottom, 16px corners, a hairline edge, no shadow.
 * Under md: a top bar with a menu sheet and a search button.
 */
const AppShell = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    // The phone workspace brings its own header (back arrow, title, roast).
    const inWorkspace = !!useMatch("/problems/:slug");

    // Escape always closes the menu, even straight after it opens.
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen]);

    return (
        <div className="flex min-h-dvh flex-col bg-frame text-foreground md:h-dvh">
            <header className="relative hidden h-[49px] shrink-0 items-center justify-between px-[18px] md:flex">
                <Wordmark className="text-[17px]" />
                {/* centred over the sheet (from the sidebar's edge to the right inset), as in the frame */}
                <div className="pointer-events-none absolute inset-y-0 right-2 left-[229px] flex items-center justify-center px-4">
                    <div className="pointer-events-auto w-full max-w-[439px]">
                        <ProblemSearch variant="bar" />
                    </div>
                </div>
                <div className="relative z-10 flex justify-end pr-[29px] text-foreground">
                    <ThemeToggle />
                </div>
            </header>

            <header className={`flex h-12 shrink-0 items-center gap-1 px-1 md:hidden ${inWorkspace ? "max-md:hidden" : ""}`}>
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            aria-label="Open menu"
                            className="flex size-11 items-center justify-center rounded-control text-foreground"
                        >
                            <MenuIcon className="size-5" strokeWidth={1.75} aria-hidden />
                        </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[280px] justify-between bg-frame p-3">
                        <SheetTitle className="sr-only">Menu</SheetTitle>
                        <SheetDescription className="sr-only">Navigate Code Cafe</SheetDescription>
                        <div className="flex flex-col gap-6">
                            <Wordmark className="h-9 px-[10px]" />
                            <NavLinks onNavigate={() => setMenuOpen(false)} />
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between px-[10px] text-[14px] text-muted-ink">
                                Theme
                                <ThemeToggle className="text-foreground" />
                            </div>
                            <Account onNavigate={() => setMenuOpen(false)} />
                        </div>
                    </SheetContent>
                </Sheet>
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
