import { Link, useNavigate } from "react-router";
import ThemeToggle from "./ThemeToggle";
import Wordmark from "./Wordmark";
import { useAuth } from "../lib/auth";

const link = "rounded-control px-2 py-1 text-[14px] text-foreground no-underline hover:bg-raised";

/** The public top bar (landing, about, sign in): the same frame tint and wordmark as the app shell. */
const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border bg-frame px-4 py-2 text-foreground">
            <Wordmark />
            <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
                <Link to="/problems" className={link}>
                    Problems
                </Link>
                {user ? (
                    <>
                        <Link to="/submissions" className={link}>
                            Submissions
                        </Link>
                        <span className="px-2 text-[14px] text-muted-ink">{user}</span>
                        <button
                            type="button"
                            className={link}
                            onClick={async () => {
                                await logout();
                                navigate("/signin");
                            }}
                        >
                            Log out
                        </button>
                    </>
                ) : (
                    <Link to="/signin" className={link}>
                        Log in / Register
                    </Link>
                )}
                <ThemeToggle className="ml-2" />
            </nav>
        </header>
    );
};

export default Navbar;
