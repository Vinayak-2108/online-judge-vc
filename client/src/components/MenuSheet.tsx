import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { ListIcon, LogInIcon, LogOutIcon, MenuIcon, NotebookTextIcon } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
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
export function Account({ onNavigate }: { onNavigate?: () => void }) {
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

/** The phone menu: a button that opens a sheet with navigation, the theme switch and the account. */
export function MenuSheet({ className = "" }: { className?: string }) {
    const [open, setOpen] = useState(false);

    // Escape always closes the menu, even straight after it opens.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    aria-label="Open menu"
                    className={`flex size-11 items-center justify-center rounded-control text-foreground ${className}`}
                >
                    <MenuIcon className="size-5" strokeWidth={1.75} aria-hidden />
                </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] justify-between bg-frame p-3">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">Navigate Code Cafe</SheetDescription>
                <div className="flex flex-col gap-6">
                    <Wordmark className="h-9 px-[10px]" />
                    <NavLinks onNavigate={() => setOpen(false)} />
                </div>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between px-[10px] text-[14px] text-muted-ink">
                        Theme
                        <ThemeToggle className="text-foreground" />
                    </div>
                    <Account onNavigate={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
