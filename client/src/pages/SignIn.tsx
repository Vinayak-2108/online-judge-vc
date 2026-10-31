import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { CircleAlertIcon, EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "../components/ThemeToggle";
import Wordmark from "../components/Wordmark";
import { login_user, register_user } from "../controllers/UserRoutes";
import { useAuth } from "../lib/auth";

type Errors = Partial<Record<"username" | "email" | "password", string>>;

const PASSWORD_RULES = "At least 8 characters, not only numbers, not a common password.";

/** Messages from the backend's validators, as one readable sentence. */
const joinMessages = (value: unknown): string => (Array.isArray(value) ? value.join(" ") : String(value ?? ""));

function FieldError({ id, children }: { id: string; children?: string }) {
    if (!children) return null;
    return (
        <p id={id} role="alert" className="m-0 mt-2 flex items-start gap-2 text-[13px] leading-[18px] text-negative">
            <CircleAlertIcon className="mt-px size-4 shrink-0" aria-hidden />
            {children}
        </p>
    );
}

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
    return (
        <label htmlFor={htmlFor} className="mb-2 block text-[15px] leading-5 font-medium text-foreground">
            {children}
        </label>
    );
}

/** Only same-site paths are followed after login (no //host, no schemes). */
export function safeNext(value: string | null): string {
    return value && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/problems";
}

/** Two username ideas for a taken name: a number on the end, and the part of the email before the @. */
export function usernameSuggestions(username: string, email: string): string[] {
    const local = email.split("@")[0]?.replace(/[^A-Za-z0-9._]/g, "") ?? "";
    return [`${username}2`, local && local.toLowerCase() !== username.toLowerCase() ? local : `${username}.1`];
}

/** Sign in and create account share one card; /signin?mode=signup opens the second. */
const SignIn = () => {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const [params, setParams] = useSearchParams();
    const signup = params.get("mode") === "signup";
    const target = safeNext(params.get("next"));

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [busy, setBusy] = useState(false);

    // After an error, put the cursor in the first field that needs attention.
    useEffect(() => {
        const first = (["username", "email", "password"] as const).find((name) => errors[name]);
        if (first) document.getElementById(first)?.focus();
    }, [errors]);

    const switchMode = () => {
        setErrors({});
        const next = params.get("next");
        setParams(signup ? (next ? { next } : {}) : { mode: "signup", ...(next ? { next } : {}) });
    };

    const validate = (): Errors => {
        const found: Errors = {};
        if (!username.trim()) found.username = "Enter a username.";
        if (signup) {
            if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = "Enter a valid email address.";
            if (password.length < 8 || /^\d+$/.test(password))
                found.password = `${PASSWORD_RULES} This one is ${password.length} ${password.length === 1 ? "character" : "characters"}.`;
        } else if (!password) found.password = "Enter your password.";
        return found;
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const found = validate();
        setErrors(found);
        if (Object.keys(found).length) return;
        setBusy(true);
        try {
            if (signup) {
                const data = await register_user({ username: username.trim(), email: email.trim(), password });
                if (data.token) {
                    await login(data.token);
                    navigate(target);
                    return;
                }
                const [first, second] = usernameSuggestions(username.trim(), email.trim());
                setErrors({
                    username: data.username
                        ? /exist|taken|unique/i.test(joinMessages(data.username))
                            ? `That username is taken. Try ${first} or ${second}.`
                            : joinMessages(data.username)
                        : undefined,
                    email: data.email
                        ? /exist|taken|unique/i.test(joinMessages(data.email))
                            ? "That email is already registered. Try signing in."
                            : joinMessages(data.email)
                        : undefined,
                    password: data.password ? joinMessages(data.password) : undefined,
                });
            } else {
                const data = await login_user({ username: username.trim(), password });
                if (data.tag && data.token) {
                    await login(data.token);
                    navigate(target);
                    return;
                }
                setErrors({ password: data.error ?? "Invalid username or password." });
            }
        } catch {
            setErrors({ password: "Could not reach the server. Try again in a moment." });
        } finally {
            setBusy(false);
        }
    };

    const described = (name: keyof Errors, extra?: string) =>
        [errors[name] ? `${name}-error` : null, extra].filter(Boolean).join(" ") || undefined;

    // Already signed in: nothing to do here.
    if (user) return <Navigate to={target} replace />;

    return (
        <div className="flex min-h-dvh flex-col bg-frame text-foreground">
            <header className="flex h-[70px] shrink-0 items-center justify-between px-8 max-md:px-4">
                <Wordmark className="text-[17px]" />
                <ThemeToggle />
            </header>

            <main className="flex flex-1 items-center justify-center px-4 py-6">
                <div className="w-full max-w-[418px] overflow-hidden rounded-[14px] border border-border bg-sheet">
                    <div className="flex h-3.5 justify-between" aria-hidden>
                        {Array.from({ length: 8 }, (_, i) => (
                            <span key={i} className="w-7 bg-brand-fill" />
                        ))}
                    </div>
                    <form onSubmit={submit} noValidate className="px-9 pt-8 pb-9 max-sm:px-6" aria-label={signup ? "Create account" : "Sign in"}>
                        <h1 className="m-0 text-2xl leading-8 font-semibold tracking-[-0.01em]">
                            {signup ? "Open a tab" : "Welcome back to the counter"}
                        </h1>
                        <p className="mt-2 mb-6 text-[15px] leading-[1.45] text-muted-ink">
                            {signup
                                ? "Create an account to keep your submissions and solved problems."
                                : "Sign in to pick up where you left off."}
                        </p>

                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            name="username"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            aria-invalid={!!errors.username}
                            aria-describedby={described("username")}
                            className="h-10 px-3 text-[15px]"
                        />
                        <FieldError id="username-error">{errors.username}</FieldError>

                        {signup && (
                            <div className="mt-5">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    aria-invalid={!!errors.email}
                                    aria-describedby={described("email")}
                                    className="h-10 px-3 text-[15px]"
                                />
                                <FieldError id="email-error">{errors.email}</FieldError>
                            </div>
                        )}

                        <div className="mt-5">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={show ? "text" : "password"}
                                    autoComplete={signup ? "new-password" : "current-password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    aria-invalid={!!errors.password}
                                    aria-describedby={described("password", signup && !errors.password ? "password-rules" : undefined)}
                                    className="h-10 px-3 pr-10 text-[15px]"
                                />
                                <button
                                    type="button"
                                    aria-label={show ? "Hide password" : "Show password"}
                                    aria-pressed={show}
                                    onClick={() => setShow((v) => !v)}
                                    className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-control text-foreground"
                                >
                                    {show ? <EyeOffIcon className="size-[18px]" aria-hidden /> : <EyeIcon className="size-[18px]" aria-hidden />}
                                </button>
                            </div>
                            <FieldError id="password-error">{errors.password}</FieldError>
                            {signup && !errors.password && (
                                <p id="password-rules" className="m-0 mt-2 text-[13px] leading-[18px] text-muted-ink">
                                    {PASSWORD_RULES}
                                </p>
                            )}
                        </div>

                        <Button type="submit" disabled={busy} className="mt-6 h-9 w-full text-[15px] font-medium">
                            {busy ? "One moment" : signup ? "Create account" : "Sign in"}
                        </Button>

                        <p className="m-0 mt-5 text-[15px] text-muted-ink">
                            {signup ? "Already have an account? " : "New here? "}
                            <Link
                                to={signup ? "/signin" : "/signin?mode=signup"}
                                onClick={(e) => {
                                    e.preventDefault();
                                    switchMode();
                                }}
                                className="font-medium text-brand"
                            >
                                {signup ? "Sign in" : "Create an account"}
                            </Link>
                        </p>
                    </form>
                </div>
            </main>

            <footer className="shrink-0 px-4 pb-6 text-center text-[13px] text-muted-ink">
                Code is judged in a sandbox by Judge0. Nothing you write runs on our server.
            </footer>
        </div>
    );
};

export default SignIn;
