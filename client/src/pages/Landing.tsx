import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router";
import { ChevronLeftIcon, ChevronRightIcon, CoffeeIcon } from "lucide-react";
import { useReducedMotion } from "motion/react";

import ThemeToggle from "../components/ThemeToggle";
import { get_all_questions } from "../controllers/QuestionRoutes";
import { get_all_submissions } from "../controllers/SubmissionRoutes";
import { useAuth } from "../lib/auth";
import {
    formatPercent,
    formatRuntime,
    LANGUAGE_LABEL,
    relativeTime,
    ROAST_LABEL,
    TIME_LIMIT_S,
    verdictKind,
    verdictShort,
} from "../lib/format";
import type { Question, Roast, Submission } from "../types";
import HeroEditor from "./landing/HeroEditor";
import "./landing/landing.css";

const sectionPad = "160px 32px";

/** Scroll-in entrance: a ref callback and the classes for the element. Visible at once where observers do not exist. */
function useReveal(extra = ""): [(el: HTMLElement | null) => void, string] {
    const [el, setEl] = useState<HTMLElement | null>(null);
    const [shown, setShown] = useState(typeof IntersectionObserver === "undefined");
    useEffect(() => {
        if (!el || shown) return;
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setShown(true);
                    io.disconnect();
                }
            },
            { threshold: 0.12 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [el, shown]);
    const ref = useCallback((node: HTMLElement | null) => setEl(node), []);
    return [ref, `reveal ${extra} ${shown ? "in" : ""}`];
}

/* ---------------- awning ---------------- */

function Awning({ height = 56, className = "" }: { height?: number; className?: string }) {
    return (
        <div aria-hidden className={className} style={{ display: "flex", alignSelf: "stretch", height, overflow: "hidden" }}>
            {Array.from({ length: 30 }, (_, k) => (
                <span key={k} style={{ flex: "0 0 28px", height, background: k % 2 ? "var(--sheet)" : "var(--brand-fill)" }} />
            ))}
        </div>
    );
}

/* ---------------- hero ---------------- */

function Hero() {
    const { user } = useAuth();
    return (
        <section className="hero" aria-label="Code Cafe">
            <div
                className="hero-card"
                style={{ background: "var(--sheet)", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden", minWidth: 0 }}
            >
                <Awning className="hero-stripes" />
                <div className="hero-toggle" style={{ alignSelf: "stretch", display: "flex", justifyContent: "flex-end", padding: "20px 32px 0" }}>
                    <ThemeToggle />
                </div>
                <div
                    className="hero-body"
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "24px 32px 48px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text)" }}>
                        <CoffeeIcon size={34} strokeWidth={2} color="var(--brand)" aria-hidden />
                        <span className="display hero-brand" style={{ fontSize: 40 }}>
                            Code Cafe
                        </span>
                    </div>
                    <h1 className="display" style={{ fontSize: "clamp(54px, 7vw, 108px)", marginTop: 44 }}>
                        Solve it while
                        <br />
                        it is still hot
                    </h1>
                    <p className="hero-copy" style={{ maxWidth: "36ch", fontSize: 19, lineHeight: 1.5, margin: "32px 0 0" }}>
                        An online judge for C, C++, Python and Java. Pick a problem off the menu, write your solution, and get a verdict in seconds.
                    </p>
                    <a className="btn btn-accent" href="#menu" style={{ marginTop: 32 }}>
                        See today’s menu
                    </a>
                </div>
                <nav
                    aria-label="On this page"
                    style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px 32px", padding: "0 24px 28px", fontSize: 15, fontWeight: 500 }}
                >
                    <a href="#how" style={{ color: "var(--text)" }}>
                        How a run works
                    </a>
                    <a href="#menu" style={{ color: "var(--text)" }}>
                        The menu
                    </a>
                    {user ? (
                        <Link to="/problems" style={{ color: "var(--text)" }}>
                            Your problems
                        </Link>
                    ) : (
                        <Link to="/signin" style={{ color: "var(--text)" }}>
                            Sign in
                        </Link>
                    )}
                    <span className="nav-theme">
                        <ThemeToggle />
                    </span>
                </nav>
            </div>
            <HeroEditor />
        </section>
    );
}

/* ---------------- how a run works ---------------- */

const stepTitle: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700 };
const stepText: CSSProperties = { margin: "10px 0 0", fontSize: 16, lineHeight: 1.5, color: "var(--muted)" };
const panel: CSSProperties = { width: 280, height: 350, boxSizing: "border-box", background: "var(--raised)" };
const inset: CSSProperties = { background: "var(--sheet)", borderRadius: 6, padding: "10px 12px", fontSize: 13, lineHeight: 1.6 };
const monoStyle: CSSProperties = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }; // taste-skill-ignore: literal code
const kw: CSSProperties = { color: "var(--kw)" };

const TEST_TIMES = ["0.011 s", "0.012 s", "0.010 s", "0.013 s", "0.012 s", "0.031 s", "0.014 s"];

function Step({ title, text, gap, children }: { title: string; text: string; gap: number; children: React.ReactNode }) {
    const [ref, cls] = useReveal();
    return (
        <div ref={ref} className={`how-col ${cls}`}>
            <h3 style={stepTitle}>{title}</h3>
            <p style={stepText}>{text}</p>
            <div style={{ height: gap }} />
            {children}
        </div>
    );
}

function HowItWorks() {
    const reduce = useReducedMotion();
    const [headRef, headCls] = useReveal();
    const row = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(60);

    const measure = () => {
        const el = row.current;
        if (el) setProgress(Math.round(((el.scrollLeft + el.clientWidth) / el.scrollWidth) * 100));
    };
    useEffect(() => {
        const el = row.current;
        if (!el) return;
        const id = requestAnimationFrame(measure);
        return () => cancelAnimationFrame(id);
    }, []);

    const scrollBy = (dir: 1 | -1) =>
        row.current?.scrollBy({ left: dir * 312, behavior: reduce ? "auto" : "smooth" });

    return (
        <section id="how" className="how" style={{ background: "var(--sheet)", padding: sectionPad, overflow: "hidden" }}>
            <div ref={headRef} className={headCls} style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <h2 className="display" style={{ fontSize: 64, flex: 1 }}>
                    How a run works
                </h2>
                <div className="how-nav" style={{ display: "flex", gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => scrollBy(-1)}
                        aria-label="Previous moment"
                        style={{ width: 48, height: 48, border: 0, background: "var(--raised)", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        <ChevronLeftIcon size={20} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollBy(1)}
                        aria-label="Next moment"
                        style={{ width: 48, height: 48, border: 0, background: "var(--primary)", color: "var(--primary-ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        <ChevronRightIcon size={20} strokeWidth={2} aria-hidden />
                    </button>
                </div>
            </div>
            <div aria-hidden style={{ height: 6, background: "var(--raised)", marginTop: 20 }}>
                <div style={{ height: 6, width: `${progress}%`, background: "var(--text)", transition: "width .32s ease" }} />
            </div>
            <div ref={row} className="how-row" tabIndex={0} role="region" aria-label="The steps of a run, scrollable" onScroll={measure}>
                <Step title="Take a seat" text="Sign in and pick a problem from the menu. Each one shows its roast and how many people got it right." gap={96}>
                    <img
                        src="/images/interior-of-a-coffee-house-miller.jpg"
                        alt="An empty coffee-house room with a counter and a fireplace, drawn in grey wash by James Miller"
                        width={280}
                        height={350}
                        loading="lazy"
                        decoding="async"
                        style={{ width: 280, height: 350, objectFit: "cover", display: "block" }}
                    />
                </Step>
                <Step title="Read the problem" text="The statement, two worked examples and the limits, all on one page beside the editor." gap={140}>
                    <div className="ui" data-ui="statement" style={{ ...panel, padding: 20, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Balanced Brackets</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                            <span style={{ width: 10, height: 14, borderRadius: 2, background: "var(--roast-medium)" }} />
                            Medium roast
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.45 }}>
                            Read a string of ( ) [ ] {"{ }"} and print YES if every bracket is closed in the right order, otherwise NO.
                        </div>
                        <div style={inset}>
                            <div style={{ color: "var(--muted)" }}>Input</div>
                            <div style={monoStyle}>([]{"{}"})</div>
                            <div style={{ color: "var(--muted)" }}>Output</div>
                            <div style={monoStyle}>YES</div>
                        </div>
                    </div>
                </Step>
                <Step title="Write it your way" text="C, C++, Python or Java. Your draft is saved as you type, so a closed tab costs nothing." gap={80}>
                    <pre
                        className="ui"
                        data-ui="code"
                        style={{ ...monoStyle, width: 280, height: 350, boxSizing: "border-box", margin: 0, background: "var(--code)", border: "1px solid var(--border)", padding: "18px 14px", fontSize: 12, lineHeight: 1.75, overflow: "hidden", color: "var(--text)" }}
                    >
                        {"stack = []\npairs = {')': '(', ']': '['}\n"}
                        <span style={kw}>for</span> ch <span style={kw}>in</span> input().strip():{"\n    "}
                        <span style={kw}>if</span> ch <span style={kw}>in</span> {"'([{'"}:{"\n        stack.append(ch)\n    "}
                        <span style={kw}>elif not</span> stack:{"\n        "}
                        <span style={kw}>print</span>(&apos;NO&apos;){"\n        "}
                        <span style={kw}>break</span>
                    </pre>
                </Step>
                <Step title="Run it on your input" text="Try your own case first. The output and the run time come back in a second or two." gap={124}>
                    <div className="ui" data-ui="run" style={{ ...panel, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ ...inset, padding: "12px 14px" }}>
                            <div style={{ color: "var(--muted)" }}>Your input</div>
                            <div style={monoStyle}>([)]</div>
                        </div>
                        <div style={{ ...inset, padding: "12px 14px" }}>
                            <div style={{ color: "var(--muted)" }}>Output</div>
                            <div style={monoStyle}>NO</div>
                            <div style={{ color: "var(--muted)" }}>Ran in 0.012 s</div>
                        </div>
                    </div>
                </Step>
                <Step title="Submit for judging" text="Every hidden test runs in a sandbox. The first failing test is the one you are told about." gap={104}>
                    <div className="ui" data-ui="tests" style={{ ...panel, padding: 20, fontSize: 14 }}>
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>Judging 12 test cases</div>
                        {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: n <= 7 ? "var(--positive)" : "var(--negative)" }} />
                                <span style={{ flex: 1 }}>Test {n}</span>
                                <span className="num" style={{ color: n <= 7 ? "var(--muted)" : "var(--negative)" }}>
                                    {n <= 7 ? TEST_TIMES[n - 1] : "Wrong answer"}
                                </span>
                            </div>
                        ))}
                    </div>
                </Step>
                <Step title="Read the ticket" text="Verdict, tests passed and run time, printed like a till slip and kept in your submissions." gap={132}>
                    <div style={{ ...panel, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 228, background: "var(--paper)", color: "var(--paper-ink)", padding: "16px 18px", transform: "rotate(2deg)", fontSize: 15, lineHeight: 1.6 }}>
                            <div style={{ fontWeight: 700 }}>Submission #1051</div>
                            <div aria-hidden style={{ color: "#615a52", letterSpacing: ".1em" }}>
                                - - - - - - - - - - - -
                            </div>
                            <div>Balanced Brackets</div>
                            <div>Python 3.8</div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Wrong answer</span>
                                <span className="num">7 of 12</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Run time</span>
                                <span className="num">0.031 s</span>
                            </div>
                        </div>
                    </div>
                </Step>
            </div>
        </section>
    );
}

/* ---------------- on the menu ---------------- */

const DECK_SLUGS = ["nth-fibonacci", "reverse-a-string", "count-the-vowels", "sum-of-two-numbers", "balanced-brackets", "coin-change"];

const EXCERPTS: Record<string, string> = {
    "nth-fibonacci": "Print the nth Fibonacci number for n up to 90. Big enough that an int overflows.",
    "reverse-a-string": "Read one word and print it backwards. Easy, until the empty line.",
    "count-the-vowels": "Count a, e, i, o and u in one line of text, upper or lower case.",
    "sum-of-two-numbers": "Read two integers and print their sum. The best first problem on the menu: three tests, all of them friendly.",
    "balanced-brackets": "Decide whether every bracket in a line is closed in the right order.",
    "coin-change": "The fewest coins that make an amount, or -1 when no mix of coins can.",
};

interface DeckItem {
    slug: string;
    name: string;
    roast: Roast;
    excerpt: string;
    acceptance: string;
}

function firstSentence(text: string): string {
    const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
    return first.length > 140 ? `${first.slice(0, 137)}...` : first;
}

function pickDeck(questions: Question[]): DeckItem[] {
    const bySlug = new Map(questions.map((q) => [q.slug, q]));
    let picked = DECK_SLUGS.map((s) => bySlug.get(s)).filter((q): q is Question => !!q);
    if (picked.length < 3) picked = questions.slice(0, 6);
    return picked.map((q) => ({
        slug: q.slug,
        name: q.name,
        roast: q.difficulty,
        excerpt: EXCERPTS[q.slug] ?? firstSentence(q.description),
        acceptance: formatPercent(q.acceptance_rate),
    }));
}

function Menu({ questions }: { questions: Question[] }) {
    const [titleRef, titleCls] = useReveal();
    const [deckRef, deckCls] = useReveal();
    const deck = useMemo(() => pickDeck(questions), [questions]);
    const start = Math.max(0, deck.findIndex((d) => d.slug === "sum-of-two-numbers"));
    const [chosen, setChosen] = useState<number | null>(null);
    const active = Math.min(chosen ?? (start === -1 ? 0 : start), Math.max(deck.length - 1, 0));

    const counts = { light: 0, medium: 0, dark: 0 } as Record<Roast, number>;
    questions.forEach((q) => (counts[q.difficulty] += 1));

    return (
        <section id="menu" className="menu" style={{ background: "var(--frame)", padding: sectionPad }}>
            <h2 ref={titleRef} className={`display ${titleCls}`} style={{ fontSize: 64 }}>
                On the menu
            </h2>
            <div ref={deckRef} className={`deck ${deckCls}`} style={{ display: "flex", height: 360, overflow: "hidden", marginTop: 40 }}>
                {deck.map((item, i) => {
                    const flex = i < active ? "0 0 120px" : i === active ? "0 0 620px" : i === active + 1 ? "1 1 0px" : "0 0 0px";
                    const style: CSSProperties = {
                        flex,
                        minWidth: 0,
                        overflow: "hidden",
                        border: 0,
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                        background: `var(--roast-${item.roast})`,
                        color: `var(--roast-${item.roast}-ink)`,
                        font: "inherit",
                        display: "block",
                        textDecoration: "none",
                    };
                    const spine = i < active;
                    const inner = (
                        <>
                            {spine && (
                                <div className="spine">
                                    <span>{item.name}</span>
                                </div>
                            )}
                            <div className="inner" style={{ width: 556, height: 360, boxSizing: "border-box", padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
                                <span style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.1, letterSpacing: "-.01em" }}>{item.name}</span>
                                <span style={{ fontSize: 16, lineHeight: 1.5, maxWidth: "46ch" }}>{item.excerpt}</span>
                                <span style={{ flex: 1 }} />
                                <span style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 16 }}>
                                    <span>
                                        {ROAST_LABEL[item.roast]} {"·"} {item.acceptance} accepted
                                    </span>
                                    <span className="solve" style={{ fontWeight: 600 }}>
                                        Solve it
                                    </span>
                                </span>
                            </div>
                        </>
                    );
                    return i === active ? (
                        <Link key={item.slug} className="card" to={`/problems/${item.slug}`} style={style} aria-label={`${item.name}: solve it`}>
                            {inner}
                        </Link>
                    ) : (
                        <button key={item.slug} type="button" className="card" onClick={() => setChosen(i)} aria-expanded={false} style={style}>
                            {inner}
                        </button>
                    );
                })}
            </div>
            <p style={{ margin: "48px 0 0", fontSize: 17, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {questions.length
                    ? `${questions.length} problems on the menu: ${counts.light} light, ${counts.medium} medium, ${counts.dark} dark roast.`
                    : "The menu is being written."}{" "}
                <Link to="/problems" style={{ fontWeight: 600 }}>
                    See the full menu
                </Link>
            </p>
        </section>
    );
}

/* ---------------- showcase: the table and six real slips ---------------- */

const SLIP_HEIGHTS = [300, 380, 270, 350, 250, 330];
const SLIP_TILTS = [0, -1.5, 0, 1.5, 0, -1];

/** Six recent submissions, newest first, favouring a mix of verdicts. */
export function pickSlips(rows: Submission[]): Submission[] {
    const byTime = [...rows].sort((a, b) => Date.parse(b.submission_time) - Date.parse(a.submission_time));
    const chosen: Submission[] = [];
    const seen = new Set<string>();
    for (const s of byTime) {
        const kind = verdictKind(s.verdict);
        if (!seen.has(kind) && chosen.length < 6) {
            seen.add(kind);
            chosen.push(s);
        }
    }
    for (const s of byTime) if (chosen.length < 6 && !chosen.includes(s)) chosen.push(s);
    return chosen.sort((a, b) => Date.parse(b.submission_time) - Date.parse(a.submission_time));
}

function slipTime(s: Submission): string {
    const kind = verdictKind(s.verdict);
    if (kind === "time") return `over ${TIME_LIMIT_S} s`;
    if (kind === "compile" || kind === "runtime") return "stopped";
    return formatRuntime(s.runtime_ms);
}

function SlipCard({ s, i }: { s: Submission; i: number }) {
    const [ref, cls] = useReveal("reveal-slip");
    return (
        <div
            ref={ref}
            className={`slip ${cls}`}
            style={{
                flex: 1,
                minWidth: 0,
                height: SLIP_HEIGHTS[i % 6],
                background: "#ffffff",
                color: "#1a1612",
                padding: "18px 18px 0",
                boxSizing: "border-box",
                transform: `rotate(${SLIP_TILTS[i % 6]}deg)`,
                transitionDelay: `${i * 70}ms`,
                fontSize: 15,
                lineHeight: 1.6,
            }}
        >
            <div style={{ fontWeight: 700 }}>Submission #{s.id}</div>
            <div aria-hidden style={{ color: "#615a52", letterSpacing: ".1em" }}>
                - - - - - - - - - -
            </div>
            <div>{s.problem}</div>
            <div>{LANGUAGE_LABEL[s.language] ?? s.language}</div>
            <div>{verdictShort(s.verdict)}</div>
            <div className="num">{s.passed != null && s.total != null ? `${s.passed} of ${s.total} tests` : "\u2014"}</div>
            <div className="num">{slipTime(s)}</div>
            <div style={{ color: "#615a52" }}>{relativeTime(s.submission_time)}</div>
        </div>
    );
}

function Showcase({ submissions }: { submissions: Submission[] }) {
    const slips = useMemo(() => pickSlips(submissions), [submissions]);
    const [scrimRef, scrimCls] = useReveal();
    return (
        <section className="showcase" style={{ position: "relative", height: 900, overflow: "hidden", background: "#111" }}>
            <img
                src="/images/coffee-house-kolkata.jpg"
                alt="Students and regulars reading and talking at tables in the Indian Coffee House, College Street, Kolkata"
                width={1920}
                height={1440}
                loading="lazy"
                decoding="async"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 70%" }}
            />
            <div ref={scrimRef} className={`scrim ${scrimCls}`} style={{ position: "absolute", left: "18%", top: 112, width: "min(600px, 70%)", background: "rgba(12,10,8,.72)", color: "#ffffff", padding: "36px 40px" }}>
                <h2 className="display" style={{ fontSize: 56 }}>
                    Argued over at a table
                </h2>
                <p style={{ margin: "20px 0 0", fontSize: 22, lineHeight: 1.45 }}>
                    Coffee houses have always been where people bring a hard problem and argue it out. Code Cafe keeps the table and adds a judge that never gets tired.
                </p>
                <p style={{ margin: "16px 0 0", fontSize: 22, lineHeight: 1.45 }}>
                    Every run prints a slip. {slips.length ? `These ${slips.length === 6 ? "six" : slips.length} came in this week.` : "The first ones will land here."}
                </p>
                <p style={{ margin: "20px 0 0", fontSize: 13, color: "#ffffff" }}>Pictured: the Indian Coffee House, College Street, Kolkata.</p>
            </div>

            <div className="slips" style={{ position: "absolute", left: 12, right: 12, bottom: -48, gap: 12, alignItems: "flex-end" }}>
                {slips.map((s, i) => (
                    <SlipCard key={s.id} s={s} i={i} />
                ))}
            </div>
        </section>
    );
}

/* ---------------- call to action and footer ---------------- */

function Cta() {
    const { user } = useAuth();
    const [cardRef, cardCls] = useReveal();
    return (
        <section id="signin" className="cta" style={{ position: "relative", minHeight: 760, overflow: "hidden", background: "var(--field)", color: "var(--on-field)", padding: "0 32px" }}>
            <p className="cta-copy" style={{ position: "absolute", left: 32, bottom: 64, maxWidth: "30%", margin: 0, fontSize: 22, lineHeight: 1.45 }}>
                Free to use. No card, nothing to install. Your code runs in Judge0’s sandbox, never on our server.
            </p>
            <div
                ref={cardRef}
                className={`cta-card ${cardCls}`}
                style={{ background: "var(--card)", color: "var(--text)", boxSizing: "border-box", padding: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}
            >
                <h2 className="display" style={{ fontSize: 44 }}>
                    {user ? "Back to the counter" : "Your table is ready"}
                </h2>
                <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, maxWidth: "40ch" }}>
                    {user
                        ? `Welcome back, ${user}. Your drafts and submissions are right where you left them.`
                        : "Make an account and the first problem is waiting: Sum of Two Numbers, a light roast with three friendly tests."}
                </p>
                <Link className="btn btn-primary" to={user ? "/problems" : "/signin?mode=signup"} style={{ alignSelf: "stretch", height: 56, fontSize: 16, marginTop: 16 }}>
                    {user ? "Open the problems" : "Create an account"}
                </Link>
                {!user && (
                    <p style={{ margin: 0, fontSize: 15, color: "var(--muted)" }}>
                        Already have one?{" "}
                        <Link to="/signin" style={{ fontWeight: 600 }}>
                            Sign in
                        </Link>
                    </p>
                )}
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer style={{ background: "var(--field)", padding: "120px 16px 48px" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <div aria-hidden style={{ display: "flex", height: 50, overflow: "hidden" }}>
                    {Array.from({ length: 12 }, (_, j) => (
                        <span key={j} style={{ flex: "0 0 100px", height: 100, borderRadius: 999, background: "var(--sheet)" }} />
                    ))}
                </div>
                <div style={{ background: "var(--sheet)", color: "var(--text)", padding: "48px 56px 32px" }}>
                    <div className="foot-panel">
                        <div>
                            <h2 className="display" style={{ fontSize: 44 }}>
                                See you at the counter
                            </h2>
                            <p style={{ margin: "20px 0 0", fontSize: 17, lineHeight: 1.55, maxWidth: "42ch" }}>
                                Code Cafe is open source. Found a wrong test case or a bug in the judge? Tell us on GitHub and it gets fixed.
                            </p>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
                            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12, fontSize: 18 }}>
                                <li>
                                    <Link to="/problems">Problems</Link>
                                </li>
                                <li>
                                    <Link to="/submissions">Your submissions</Link>
                                </li>
                                <li>
                                    <a href="https://github.com/Vinayak-2108/online-judge-vc">GitHub: Vinayak-2108/online-judge-vc</a>
                                </li>
                                <li>
                                    <a href="#how">How a run works</a>
                                </li>
                            </ul>
                            <div style={{ flex: "none", width: 88, background: "var(--raised)", padding: 6, alignSelf: "flex-start" }}>
                                <img
                                    src="/images/london-coffee-house-1600s.jpg"
                                    alt="A 17th-century London coffee house: men in wigs reading and talking at long tables"
                                    width={88}
                                    height={117}
                                    loading="lazy"
                                    decoding="async"
                                    style={{ width: 88, height: 117, objectFit: "cover", display: "block", filter: "grayscale(1)" }}
                                />
                            </div>
                        </div>
                    </div>
                    <p style={{ margin: "48px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--muted)", textAlign: "center" }}>
                        © 2026 Code Cafe. Pictures:{" "}
                        <a href="https://commons.wikimedia.org/wiki/File:India-coffee-house-kolkata.jpg">“India-coffee-house-kolkata”</a> by Chopr,{" "}
                        <a href="https://creativecommons.org/licenses/by/2.0">CC BY 2.0</a>;{" "}
                        <a href="https://commons.wikimedia.org/wiki/File:James_Miller_-_The_Interior_of_a_Coffee_House_-_B1993.30.107(34)_-_Yale_Center_for_British_Art.jpg">
                            “The Interior of a Coffee House”
                        </a>{" "}
                        by James Miller, CC0;{" "}
                        <a href="https://commons.wikimedia.org/wiki/File:Interior_of_a_London_Coffee-house,_17th_century.JPG">
                            “Interior of a London Coffee-house, 17th century”
                        </a>
                        , public domain. All via Wikimedia Commons.
                    </p>
                </div>
            </div>
        </footer>
    );
}

/* ---------------- the page ---------------- */

export default function Landing() {
    const location = useLocation();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);

    useEffect(() => {
        let live = true;
        get_all_questions()
            .then((q) => live && setQuestions(q))
            .catch(() => {});
        get_all_submissions({ limit: 40 })
            .then((s) => live && setSubmissions(s))
            .catch(() => {});
        return () => {
            live = false;
        };
    }, []);

    // /#how and /#menu from other pages: scroll to the section once the page is on screen.
    useEffect(() => {
        if (!location.hash) return;
        const id = location.hash.slice(1);
        const t = setTimeout(() => document.getElementById(id)?.scrollIntoView?.(), 50);
        return () => clearTimeout(t);
    }, [location.hash]);

    return (
        <div className="landing" data-page="landing">
            <main>
                <Hero />
                <HowItWorks />
                <Menu questions={questions} />
                <Showcase submissions={submissions} />
                <Cta />
            </main>
            <Footer />
        </div>
    );
}
