import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { ChevronsUpDownIcon, ListChecksIcon, LogInIcon, LogOutIcon, MenuIcon, ReceiptTextIcon } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ThemeToggle from "./ThemeToggle";
import Wordmark from "./Wordmark";
import { useAuth } from "../lib/auth";

const NAV = [
    { to: "/problems", label: "Problems", icon: ListChecksIcon },
    { to: "/submissions", label: "Submissions", icon: ReceiptTextIcon },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex h-9 items-center gap-2.5 rounded-card px-3 text-[14px] no-underline text-foreground ${
        isActive ? "bg-active font-medium" : "hover:bg-active/60"
    }`;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <nav aria-label="Main" className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={navClass} onClick={onNavigate}>
                    <Icon className="size-4 text-muted-ink" strokeWidth={1.5} aria-hidden />
                    {label}
                </NavLink>
            ))}
        </nav>
    );
}

function Account({ onNavigate }: { onNavigate?: () => void }) {
    const { user, ready, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-3 text-[13px] text-muted-ink">
                Theme
                <ThemeToggle className="text-foreground" />
            </div>
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        aria-label={`Account: ${user}`}
                        className="flex h-10 w-full items-center gap-2.5 rounded-card border border-border bg-sheet px-2.5 text-left text-[14px] text-foreground outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span
                            aria-hidden
                            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-raised text-[12px] font-medium"
                        >
                            {user.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{user}</span>
                        <ChevronsUpDownIcon className="size-4 text-muted-ink" aria-hidden />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="text-[14px]">
                        <DropdownMenuItem
                            onClick={async () => {
                                await logout();
                                onNavigate?.();
                                navigate("/signup");
                            }}
                        >
                            <LogOutIcon className="size-4" aria-hidden />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : ready ? (
                <Link
                    to="/signup"
                    onClick={onNavigate}
                    className="flex h-10 items-center justify-center gap-2 rounded-control bg-primary text-[14px] font-medium text-primary-foreground no-underline hover:opacity-90"
                >
                    <LogInIcon className="size-4" aria-hidden />
                    Log in / Register
                </Link>
            ) : (
                <div className="h-10" />
            )}
        </div>
    );
}

/**
 * Framed-sheet shell: one tinted frame (sidebar, or a top bar under md) with the work on a white
 * sheet inset 8px, 16px corners, a hairline edge and no shadow.
 */
const AppShell = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="flex min-h-dvh flex-col bg-frame text-foreground md:h-dvh md:flex-row">
            <aside className="hidden w-[232px] shrink-0 flex-col justify-between p-3 md:flex" aria-label="Sidebar">
                <div className="flex flex-col gap-6">
                    <Wordmark className="h-9 px-3" />
                    <NavLinks />
                </div>
                <Account />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col md:p-2 md:pl-0">
                <header className="flex h-12 shrink-0 items-center gap-1 px-1 md:hidden">
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
                                <Wordmark className="h-9 px-3" />
                                <NavLinks onNavigate={() => setMenuOpen(false)} />
                            </div>
                            <Account onNavigate={() => setMenuOpen(false)} />
                        </SheetContent>
                    </Sheet>
                    <Wordmark className="ml-1" />
                </header>
                <main className="min-h-0 flex-1 overflow-y-auto border-t border-border bg-sheet md:rounded-sheet md:border">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppShell;
