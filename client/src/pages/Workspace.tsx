import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { ChevronLeftIcon, ChevronRightIcon, CircleCheckIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuSheet } from "../components/MenuSheet";
import NotFound from "../components/NotFound";
import RoastMark from "../components/RoastMark";
import Runtime from "../components/Runtime";
import VerdictPill from "../components/VerdictPill";
import { get_all_questions, run_compiler, submit_compiler } from "../controllers/QuestionRoutes";
import { get_all_submissions } from "../controllers/SubmissionRoutes";
import { useAuth } from "../lib/auth";
import { useEditorTheme } from "../lib/editorTheme";
import {
    clock,
    formatPercent,
    formatRuntime,
    formatTests,
    LANGUAGE_LABEL,
    LANGUAGES,
    relativeTime,
    runtimeFor,
    TIME_LIMIT_S,
} from "../lib/format";
import { useMediaQuery } from "../lib/useMediaQuery";
import { storage } from "../lib/storage";
import type { Question, Submission } from "../types";

const STARTER: Record<string, string> = {
    py: "import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # read the input, then print the answer\n\nmain()\n",
    cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // read the input, then print the answer\n    return 0;\n}\n",
    c: "#include <stdio.h>\n\nint main(void) {\n    /* read the input, then print the answer */\n    return 0;\n}\n",
    java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        // read the input, then print the answer\n    }\n}\n",
};

const LANG_ITEMS = LANGUAGE_LABEL;

/* ---- drafts and the last run: per problem (and language), in storage that may be unavailable ---- */

const draftKey = (slug: string, lang: string) => `cc:draft:${slug}:${lang}`;
const runKey = (slug: string) => `cc:run:${slug}`;

interface Draft {
    code: string;
    at: number;
}

export function readDraft(slug: string, lang: string): Draft | null {
    try {
        const raw = storage.get(draftKey(slug, lang));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return typeof parsed?.code === "string" ? { code: parsed.code, at: Number(parsed.at) || 0 } : null;
    } catch {
        return null;
    }
}

function writeDraft(slug: string, lang: string, code: string): number {
    const at = Date.now();
    storage.set(draftKey(slug, lang), JSON.stringify({ code, at }));
    return at;
}

interface LastRun {
    input: string;
    text: string;
    meta: string;
}

function readRun(slug: string): LastRun | null {
    try {
        const parsed = JSON.parse(storage.get(runKey(slug)) ?? "null");
        return parsed && typeof parsed.text === "string" ? parsed : null;
    } catch {
        return null;
    }
}

function storedLang(): string {
    const v = storage.get("cc:lang");
    return v && v in LANGUAGE_LABEL ? v : "py";
}

/* ---- pieces ---- */

const Heading = ({ children }: { children: string }) => (
    <h2 className="m-0 mt-6 mb-1 text-[16px] leading-6 font-semibold">{children}</h2>
);

const Mono = ({ children }: { children: string }) => (
    <span className="block font-code text-[14px] leading-[22px] whitespace-pre-wrap">{children}</span>
);

function Statement({ q }: { q: Question }) {
    return (
        <div className="text-[16px] leading-[1.55] text-foreground">
            <p className="m-0">{q.description}</p>
            {q.input_format && (
                <>
                    <Heading>Input</Heading>
                    <p className="m-0 text-[15px]">{q.input_format}</p>
                </>
            )}
            {q.output_format && (
                <>
                    <Heading>Output</Heading>
                    <p className="m-0 text-[15px]">{q.output_format}</p>
                </>
            )}
            {q.examples.length > 0 && (
                <>
                    <Heading>Examples</Heading>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {q.examples.map((ex, i) => (
                            <div key={i} className="rounded-card bg-raised p-3.5" data-testid="example">
                                <div className="text-[13px] leading-5 text-muted-ink">Input</div>
                                <Mono>{ex.input}</Mono>
                                <div className="mt-1.5 text-[13px] leading-5 text-muted-ink">Output</div>
                                <Mono>{ex.output}</Mono>
                                {ex.explanation && <p className="m-0 mt-1.5 text-[13px] leading-5 text-muted-ink">{ex.explanation}</p>}
                            </div>
                        ))}
                    </div>
                </>
            )}
            <Heading>Constraints</Heading>
            <div className="text-[15px] leading-6">
                {q.constraints && <p className="m-0">{q.constraints}</p>}
                <p className="m-0">Time limit {TIME_LIMIT_S} s per test case</p>
            </div>
        </div>
    );
}

function MySubmissions({ rows, loggedIn, narrow = false }: { rows: Submission[]; loggedIn: boolean; narrow?: boolean }) {
    if (!loggedIn)
        return (
            <p className="m-0 py-4 text-[14px] text-muted-ink">
                <Link to="/signin" className="text-brand underline">
                    Log in
                </Link>{" "}
                to see your submissions for this problem.
            </p>
        );
    if (!rows.length) return <p className="m-0 py-4 text-[14px] text-muted-ink">No submissions for this problem yet.</p>;
    return (
        <ul className="m-0 list-none p-0">
            {rows.map((s) =>
                narrow ? (
                    <li key={s.id} className="border-b border-rule py-2 text-[14px]">
                        <div className="flex items-center gap-3">
                            <span className="font-code text-[13px] tabular-nums">#{s.id}</span>
                            <VerdictPill verdict={s.verdict} />
                            <span className="ml-auto tabular-nums">{formatTests(s.passed, s.total)}</span>
                        </div>
                        <div className="mt-0.5 text-[13px] text-muted-ink">
                            {LANGUAGE_LABEL[s.language] ?? s.language} {"\u00b7"} {runtimeFor(s.verdict, s.runtime_ms)} {"\u00b7"}{" "}
                            {relativeTime(s.submission_time)}
                        </div>
                    </li>
                ) : (
                    <li key={s.id} className="flex items-center gap-3 border-b border-rule py-2.5 text-[14px]">
                        <span className="font-code text-[13px] tabular-nums">#{s.id}</span>
                        <VerdictPill verdict={s.verdict} />
                        <span className="tabular-nums">{formatTests(s.passed, s.total)}</span>
                        <span className="text-muted-ink">{LANGUAGE_LABEL[s.language] ?? s.language}</span>
                        <span className="ml-auto flex items-center gap-3 text-muted-ink">
                            <Runtime text={runtimeFor(s.verdict, s.runtime_ms)} />
                            <span className="tabular-nums">{relativeTime(s.submission_time)}</span>
                        </span>
                    </li>
                ),
            )}
        </ul>
    );
}

interface Ticket {
    id: number;
    verdict: string;
    passed: number;
    total: number;
    runtime_ms: number | null;
    lang: string;
    /** ISO time */
    at: string;
}

/** The submission ticket printed after Submit. */
function TicketStrip({ t, compact = false }: { t: Ticket; compact?: boolean }) {
    if (compact)
        return (
            <div className="flex items-center gap-3 rounded-card bg-raised px-4 py-3 text-[14px]" aria-label="Latest submission">
                <span className="font-code text-[14px]">#{t.id}</span>
                <VerdictPill verdict={t.verdict} />
                <span className="font-code text-[14px] tabular-nums">{t.passed}/{t.total}</span>
                <Runtime text={runtimeFor(t.verdict, t.runtime_ms)} />
                <Link to="/submissions" className="ml-auto shrink-0 whitespace-nowrap text-brand underline">
                    All
                </Link>
            </div>
        );
    return (
        <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card bg-raised px-4 py-3 text-[14px]"
            aria-label="Latest submission"
            data-testid="ticket"
        >
            <span className="font-code text-[14px]">Submission #{t.id}</span>
            <VerdictPill verdict={t.verdict} />
            <span className="tabular-nums">
                {t.passed} of {t.total} tests passed
            </span>
            <Runtime text={runtimeFor(t.verdict, t.runtime_ms)} />
            <span className="text-muted-ink">
                {LANGUAGE_LABEL[t.lang] ?? t.lang} {"·"} {relativeTime(new Date(t.at).toISOString())}
            </span>
            <Link to="/submissions" className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-brand">
                All submissions
                <ChevronRightIcon className="size-4" aria-hidden />
            </Link>
        </div>
    );
}

/* ---- the page ---- */

type Loaded = { q: Question } | "missing" | null;

const Workspace = () => {
    const { slug = "" } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, ready } = useAuth();
    const editorTheme = useEditorTheme();
    const wide = useMediaQuery("(min-width: 1024px)");
    const phone = !useMediaQuery("(min-width: 768px)");

    const [loaded, setLoaded] = useState<Loaded>(null);
    const [mineAll, setMine] = useState<Submission[]>([]);
    const [tab, setTab] = useState<"description" | "mine">("description");
    const [chosenPhoneTab, setPhoneTab] = useState<"problem" | "code" | null>(null);

    const [lang, setLang] = useState(storedLang);
    // In-memory edits and save times, keyed by problem + language. Each key owns its own text, so a
    // language switch can never show (or save) another language's code.
    const [codes, setCodes] = useState<Record<string, string>>({});
    const [savedTimes, setSavedTimes] = useState<Record<string, number>>({});
    const [customInput, setCustomInput] = useState("");
    const [output, setOutput] = useState<{ text: string; meta: string } | null>(null);
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [localTicket, setLocalTicket] = useState<Ticket | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const pending = useRef<{ slug: string; lang: string; key: string; code: string } | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const q = loaded && loaded !== "missing" ? loaded.q : null;
    const mine = user ? mineAll : [];

    // Load the problem (by slug, or by the old numeric id).
    useEffect(() => {
        let live = true;
        get_all_questions()
            .then((list) => {
                if (!live) return;
                const found = list.find((p) => p.slug === slug) ?? list.find((p) => String(p.id) === slug);
                if (!found) return setLoaded("missing");
                if (found.slug !== slug) navigate(`/problems/${found.slug}`, { replace: true });
                setLoaded({ q: found });
                const last = readRun(found.slug);
                setCustomInput(last?.input ?? found.examples[0]?.input ?? "");
                setOutput(last ? { text: last.text, meta: last.meta } : null);
            })
            .catch(() => live && setLoaded("missing"));
        return () => {
            live = false;
        };
    }, [slug, navigate, user]);

    const refreshMine = useCallback(() => {
        if (!user) return;
        get_all_submissions({ mine: true, limit: 100 })
            .then((rows) => setMine(rows.filter((s) => s.problem_slug === slug)))
            .catch(() => {});
    }, [user, slug]);
    useEffect(() => {
        if (ready) refreshMine();
    }, [ready, refreshMine]);

    // The code for this problem and language: this session's edit, else the saved draft (read now,
    // synchronously), else the starter.
    const qSlug = q?.slug;
    const key = qSlug ? `${qSlug}:${lang}` : "";
    const stored = useMemo(() => (qSlug ? readDraft(qSlug, lang) : null), [qSlug, lang]);
    const code = codes[key] ?? stored?.code ?? STARTER[lang];
    const savedAt = key in savedTimes ? savedTimes[key] || null : (stored?.at ?? null);

    /** Writes the pending draft (if any) to ITS OWN key, now. */
    const flush = useCallback(() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = null;
        const p = pending.current;
        pending.current = null;
        if (!p) return;
        const at = writeDraft(p.slug, p.lang, p.code);
        setSavedTimes((t) => ({ ...t, [p.key]: at }));
    }, []);

    const onCode = (forKey: string, forLang: string, value: string) => {
        if (!qSlug) return;
        setCodes((c) => ({ ...c, [forKey]: value }));
        pending.current = { slug: qSlug, lang: forLang, key: forKey, code: value };
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(flush, 500);
    };
    // Leaving the page keeps what was typed.
    useEffect(() => flush, [flush]);

    const changeLang = (next: string) => {
        flush(); // the old language's text goes to the old language's key before anything changes
        setLang(next);
        storage.set("cc:lang", next);
    };

    const reset = () => {
        if (!q) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        pending.current = null;
        storage.remove(draftKey(q.slug, lang));
        setCodes((c) => ({ ...c, [key]: STARTER[lang] }));
        setSavedTimes((t) => ({ ...t, [key]: 0 }));
    };

    const extensions = useMemo(
        () => [lang === "py" ? python() : lang === "java" ? java() : cpp(), EditorView.lineWrapping],
        [lang],
    );

    const next = encodeURIComponent(location.pathname);
    const askToLogin = (message: string) =>
        toast.error(message, { action: { label: "Log in", onClick: () => navigate(`/signin?next=${next}`) } });

    const needCode = (): boolean => {
        if (!user) {
            askToLogin("Log in to run and submit code.");
            return false;
        }
        if (!code.trim()) {
            toast.error("Write some code first.");
            return false;
        }
        return true;
    };

    const run = async () => {
        if (!q || !needCode()) return;
        setRunning(true);
        try {
            const { ok, status: httpStatus, data } = await run_compiler({ lang, code, input_data: customInput, problem_id: q.id });
            if (httpStatus === 401) return askToLogin("Your session has ended. Log in to keep going.");
            if (!ok) {
                toast.error(data.error || "The run failed. Try again.");
                return;
            }
            const text = data.error || data.output || "(no output)";
            // A program that compiled and ran has a runtime and an exit code, even when it crashed.
            const meta =
                data.runtime_ms != null
                    ? `Ran in ${formatRuntime(data.runtime_ms)} \u00b7 exit code ${data.exit_code ?? (data.error ? 1 : 0)}`
                    : `${data.status ?? "Error"}`;
            setOutput({ text, meta });
            storage.set(runKey(q.slug), JSON.stringify({ input: customInput, text, meta }));
        } catch {
            toast.error("Could not reach the server.");
        } finally {
            setRunning(false);
        }
    };

    const submit = async () => {
        if (!q || !needCode()) return;
        flush();
        setSubmitting(true);
        try {
            const { ok, status: httpStatus, data } = await submit_compiler({ lang, code, problem_id: q.id });
            if (httpStatus === 401) return askToLogin("Your session has ended. Log in to keep going.");
            if (!ok || !data.verdict) {
                toast.error(data.error || "The submission failed. Try again.");
                return;
            }
            setLocalTicket({
                id: data.id ?? 0,
                verdict: data.verdict,
                passed: data.passed ?? 0,
                total: data.total ?? q.test_count,
                runtime_ms: data.runtime_ms ?? null,
                lang,
                at: new Date().toISOString(),
            });
            if (phone) setDialogOpen(true);
            refreshMine();
            // keep the header's solved/best in step
            get_all_questions().then((list) => {
                const fresh = list.find((p) => p.id === q.id);
                if (fresh) setLoaded({ q: fresh });
            });
        } catch {
            toast.error("Could not reach the server.");
        } finally {
            setSubmitting(false);
        }
    };

    // The ticket for the last submission on this problem: from the saved submissions, or the one just printed.
    const newest = mine.reduce<Submission | null>((best, s) => (!best || s.id > best.id ? s : best), null);
    const mineTicket: Ticket | null = newest && {
        id: newest.id,
        verdict: newest.verdict,
        passed: newest.passed ?? 0,
        total: newest.total ?? q?.test_count ?? 0,
        runtime_ms: newest.runtime_ms,
        lang: newest.language,
        at: newest.submission_time,
    };
    const ticket = localTicket && (!mineTicket || localTicket.id >= mineTicket.id) ? localTicket : mineTicket;
    const hasHistory = !!stored || mine.length > 0;
    const phoneTab = chosenPhoneTab ?? (hasHistory ? "code" : "problem");

    if (loaded === "missing")
        return <NotFound title="That problem is not on the menu." detail="It may have been renamed or removed." />;
    if (!q) return <p className="m-0 px-4 py-8 text-[14px] text-muted-ink md:px-8">Loading the problem</p>;

    const status = q.status ?? "new";
    const solvedLine =
        status === "solved" ? (
            <span className="inline-flex items-center gap-2 text-[15px]">
                <CircleCheckIcon className="size-[18px] text-positive" strokeWidth={2} aria-hidden />
                Solved {"·"} your best {formatRuntime(q.best_runtime_ms)}
            </span>
        ) : status === "attempted" ? (
            <span className="text-[15px] text-muted-ink">Attempted, not solved yet</span>
        ) : null;

    const meta = (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted-ink">
            <span className="text-foreground">
                <RoastMark roast={q.difficulty} />
            </span>
            {q.acceptance_rate != null && <span>{formatPercent(q.acceptance_rate)} accepted</span>}
            <span>
                {q.test_count} test {q.test_count === 1 ? "case" : "cases"}
            </span>
        </div>
    );

    const descriptionTabs = (
        <Tabs value={tab} onValueChange={(v) => setTab(v as "description" | "mine")} className="gap-0">
            <TabsList aria-label="Problem sections" className="gap-6 md:h-10">
                <TabsTrigger value="description" className="md:h-10 md:text-[15px]">
                    Description
                </TabsTrigger>
                <TabsTrigger value="mine" className="md:h-10 md:text-[15px]">
                    My submissions{" "}
                    {user && <span className="font-normal text-muted-ink tabular-nums">{mine.length}</span>}
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );

    const leftBody = tab === "description" ? <Statement q={q} /> : <MySubmissions rows={mine} loggedIn={!!user} />;

    const editorHeader = (
        <div className="flex h-[47px] shrink-0 items-center justify-between gap-3 border-b border-border px-[9px]">
            <LanguageSelect lang={lang} onChange={changeLang} />
            <div className="flex items-center gap-4 text-[13px] text-muted-ink">
                {savedAt != null && <span className="tabular-nums">Draft saved {clock(savedAt)}</span>}
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 rounded-control px-1 py-1 text-[15px] text-foreground hover:bg-raised"
                >
                    <RotateCcwIcon className="size-4" strokeWidth={2.25} aria-hidden />
                    Reset
                </button>
            </div>
        </div>
    );

    const editor = (
        <div className="min-h-0 flex-1 overflow-auto" data-testid="editor">
            <CodeMirror
                key={key}
                value={code}
                onChange={(value) => onCode(key, lang, value)}
                theme={editorTheme}
                extensions={extensions}
                height="100%"
                minHeight="280px"
                basicSetup={{ foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
                aria-label="Code editor"
            />
        </div>
    );

    const ioRow = (
        <div className="grid shrink-0 grid-cols-2 gap-4 max-md:gap-2">
            <label className="flex min-h-[104px] flex-col rounded-card border border-border px-4 py-3.5 max-md:px-3 max-md:py-2.5">
                <span className="text-[14px] leading-5 text-muted-ink">Custom input</span>
                <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    spellCheck={false}
                    rows={2}
                    aria-label="Custom input"
                    className="mt-1 min-h-[48px] flex-1 resize-none border-0 bg-transparent p-0 font-code text-[14px] leading-[22px] text-foreground outline-none focus-visible:ring-0"
                />
            </label>
            <div className="flex min-h-[104px] flex-col rounded-card bg-raised px-4 py-3.5 max-md:px-3 max-md:py-2.5" aria-live="polite">
                <span className="text-[14px] leading-5 text-muted-ink">Output</span>
                {output ? (
                    <>
                        <pre className="m-0 mt-1 max-h-24 overflow-auto font-code text-[14px] leading-[22px] whitespace-pre-wrap">{output.text}</pre>
                        <span className="mt-auto pt-1 text-[13px] text-muted-ink">{output.meta}</span>
                    </>
                ) : (
                    <span className="mt-1 text-[14px] text-muted-ink">Run your code to see its output.</span>
                )}
            </div>
        </div>
    );

    const actions = (
        <div className="flex shrink-0 items-center justify-between gap-3">
            <p className="m-0 text-[14px] text-muted-ink max-md:hidden">
                Run tries your custom input. Submit judges all {q.test_count} test cases.
            </p>
            <div className="flex gap-2 max-md:w-full">
                <Button
                    variant="outline"
                    onClick={run}
                    disabled={running}
                    className="h-9 px-4 text-[15px] font-medium max-md:h-12 max-md:flex-1"
                >
                    {running ? "Running" : "Run"}
                </Button>
                <Button
                    onClick={submit}
                    disabled={submitting}
                    className="h-9 px-4 text-[15px] font-medium max-md:h-12 max-md:flex-1"
                >
                    {submitting ? "Judging" : "Submit"}
                </Button>
            </div>
        </div>
    );

    /* ---- phone: Problem / Code as two tabs, a header with a back arrow ---- */
    if (phone) {
        return (
            <div className="flex min-h-dvh flex-col bg-sheet">
                <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
                    <Link to="/problems" aria-label="Back to Problems" className="flex size-8 items-center justify-center rounded-control text-foreground">
                        <ChevronLeftIcon className="size-5" aria-hidden />
                    </Link>
                    <h1 className="m-0 min-w-0 flex-1 truncate text-[17px] leading-6 font-semibold">{q.name}</h1>
                    <span className="shrink-0 text-[14px] text-foreground">
                        <RoastMark roast={q.difficulty} />
                    </span>
                    <MenuSheet className="-mr-2 shrink-0" />
                </header>
                <div className="px-4 pt-3">
                    <div role="tablist" aria-label="Problem and code" className="grid grid-cols-2 gap-1 rounded-card bg-raised p-1">
                        {(["problem", "code"] as const).map((key) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={phoneTab === key}
                                onClick={() => setPhoneTab(key)}
                                className={`h-9 rounded-control text-[15px] font-medium ${
                                    phoneTab === key ? "border border-control bg-sheet text-foreground" : "text-muted-ink"
                                }`}
                            >
                                {key === "problem" ? "Problem" : "Code"}
                            </button>
                        ))}
                    </div>
                </div>
                {phoneTab === "problem" ? (
                    <div className="flex flex-col gap-3 px-4 pt-3 pb-8">
                        {meta}
                        <Statement q={q} />
                        <h2 className="m-0 mt-4 text-[16px] font-semibold">Your submissions</h2>
                        <MySubmissions rows={mine} loggedIn={!!user} narrow />
                    </div>
                ) : (
                    <>
                        <div className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-[14px] text-muted-ink">
                                    Language
                                    <LanguageSelect lang={lang} onChange={changeLang} />
                                </div>
                                {savedAt != null && <span className="text-[13px] text-muted-ink tabular-nums">Draft saved {clock(savedAt)}</span>}
                            </div>
                            <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden rounded-card border border-border">{editor}</div>
                            {ioRow}
                            {ticket && <TicketStrip t={ticket} compact />}
                        </div>
                        <div className="sticky bottom-0 border-t border-border bg-sheet px-4 py-3">{actions}</div>
                    </>
                )}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent from="bottom" className="max-w-[340px] bg-sheet">
                        <DialogHeader>
                            <DialogTitle>Submission #{ticket?.id}</DialogTitle>
                            <DialogDescription>{q.name}</DialogDescription>
                        </DialogHeader>
                        {ticket && (
                            <div className="flex flex-col gap-3 text-[15px]">
                                <VerdictPill verdict={ticket.verdict} />
                                <span className="tabular-nums">
                                    {ticket.passed} of {ticket.total} tests passed
                                </span>
                                <div className="flex gap-3 text-muted-ink">
                                    <Runtime text={runtimeFor(ticket.verdict, ticket.runtime_ms)} />
                                    {LANGUAGE_LABEL[ticket.lang]}
                                </div>
                                <Link to="/submissions" className="text-brand underline">
                                    All submissions
                                </Link>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    /* ---- tablet and desktop ---- */
    const left = (
        <div className={wide ? "min-h-0 overflow-y-auto pr-1" : ""}>
            <h1 className="m-0 text-2xl leading-8 font-semibold tracking-[-0.01em]">{q.name}</h1>
            <div className="mt-[17px]">{meta}</div>
            <div className="mt-1">{descriptionTabs}</div>
            <div className="pt-[18px] pb-6">{leftBody}</div>
        </div>
    );

    const right = (
        <div className={`flex min-w-0 flex-col gap-4 ${wide ? "min-h-0" : ""}`}>
            <div
                className={`flex min-h-[320px] flex-col overflow-hidden rounded-card border border-border ${wide ? "flex-1" : "h-[420px]"}`}
            >
                {editorHeader}
                {editor}
            </div>
            {ioRow}
            {actions}
            {ticket && <TicketStrip t={ticket} />}
        </div>
    );

    return (
        <div className={`flex w-full flex-col px-8 pt-5 pb-6 ${wide ? "h-full" : ""}`}>
            <div className="flex h-5 shrink-0 items-center justify-between gap-4">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[15px]">
                    <Link to="/problems" className="text-muted-ink no-underline hover:text-foreground">
                        Problems
                    </Link>
                    <ChevronRightIcon className="size-4 text-foreground" strokeWidth={2.25} aria-hidden />
                    <span aria-current="page">{q.name}</span>
                </nav>
                {solvedLine}
            </div>
            <div
                className={`mt-5 grid gap-x-6 gap-y-8 ${wide ? "min-h-0 flex-1 grid-cols-[minmax(0,11fr)_minmax(0,17fr)]" : "grid-cols-1"}`}
            >
                {left}
                {right}
            </div>
        </div>
    );
};

function LanguageSelect({ lang, onChange }: { lang: string; onChange: (lang: string) => void }) {
    return (
        <Select value={lang} onValueChange={(v) => v && onChange(v)} items={LANG_ITEMS}>
            <SelectTrigger aria-label="Language" className="h-[29px] w-[149px] bg-sheet text-[15px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {LANGUAGES.map((key) => (
                    <SelectItem key={key} value={key}>
                        {LANGUAGE_LABEL[key]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default Workspace;
