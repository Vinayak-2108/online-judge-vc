import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demo_run, demo_submit } from "../../controllers/DemoRoutes";
import { get_submission_summary } from "../../controllers/SubmissionRoutes";
import { formatRuntime, LANGUAGE_LABEL, TIME_LIMIT_S, verdictKind, verdictShort } from "../../lib/format";

/** Working solutions to Sum of Two Numbers, so Run and Submit really judge something. */
const SOLUTIONS: Record<string, string> = {
    c: '#include <stdio.h>\n\nint main(void) {\n    long long a, b;\n    scanf("%lld %lld", &a, &b);\n    printf("%lld\\n", a + b);\n    return 0;\n}',
    cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    long long a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n}",
    py: "import sys\n\na, b = map(int, sys.stdin.read().split())\nprint(a + b)",
    java: "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        long a = in.nextLong(), b = in.nextLong();\n        System.out.println(a + b);\n    }\n}",
};

const TABS = [
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "py", label: "Python" },
    { value: "java", label: "Java" },
];

const KEYWORDS: Record<string, string> = {
    c: "#include|int|long|return|void|char|if|else|for|while",
    cpp: "#include|using|namespace|int|long|return|cin|cout|endl|if|else|for|while",
    py: "import|from|def|return|print|map|int|input|if|elif|else|for|in|while|not|break",
    java: "import|public|class|static|void|int|long|new|return|if|else|for|while",
};

/** Colours keywords with the page's keyword token; everything else stays ink. */
function highlight(code: string, lang: string) {
    const re = new RegExp(`(#include|\\b(?:${KEYWORDS[lang].replace("#include|", "")})\\b)`, "g");
    return code.split(re).map((part, i) =>
        i % 2 ? (
            <span key={i} style={{ color: "var(--kw)" }}>
                {part}
            </span>
        ) : (
            part
        ),
    );
}

const mono: CSSProperties = {
    fontFamily: "var(--font-mono)", // taste-skill-ignore: this is literal code
    fontVariantNumeric: "tabular-nums",
};

const codeBox: CSSProperties = { ...mono, fontSize: "var(--hero-code, 13px)", lineHeight: 1.7, whiteSpace: "pre", margin: 0, padding: 0 };

interface Slip {
    id: number;
    verdict: string;
    tests: string;
    time: string;
}

/** "0.016 s", "over 5 s" for a time limit, "stopped" for a crash or a compile error. */
function slipTime(verdict: string, ms: number | null): string {
    const kind = verdictKind(verdict);
    if (kind === "time") return `over ${TIME_LIMIT_S} s`;
    if (kind === "compile" || kind === "runtime") return "stopped";
    return formatRuntime(ms);
}

/**
 * The hero's live editor: a real one. Run and Submit go to the public demo endpoints
 * (Sum of Two Numbers only, throttled, nothing saved) and Submit prints a slip.
 */
export default function HeroEditor() {
    const reduce = useReducedMotion();
    const [lang, setLang] = useState("py");
    const [codes, setCodes] = useState<Record<string, string>>(SOLUTIONS);
    const [input, setInput] = useState("2 3");
    const [out, setOut] = useState<{ text: string; note: string; error: boolean } | null>(null);
    const [slip, setSlip] = useState<Slip | null>(null);
    const [nextId, setNextId] = useState<number | null>(null);
    const [busy, setBusy] = useState<"run" | "submit" | null>(null);

    const code = codes[lang];
    const lines = useMemo(() => code.split("\n"), [code]);

    // The next slip number follows the real tally.
    useEffect(() => {
        let live = true;
        get_submission_summary()
            .then((s) => live && s && setNextId(s.everyone + 1))
            .catch(() => {});
        return () => {
            live = false;
        };
    }, []);

    const fail = (status: number, message?: string) => {
        if (status === 429) toast.error("Easy there: ten tries a minute. Give it a moment.");
        else toast.error(message || "The judge could not be reached. Try again in a moment.");
    };

    const run = async () => {
        setBusy("run");
        try {
            const { ok, status, data } = await demo_run({ lang, code, input_data: input });
            if (!ok) return fail(status, data.error);
            const failed = !!data.error;
            setOut({
                text: data.error || data.output || "(no output)",
                note:
                    data.runtime_ms != null
                        ? `Ran in ${formatRuntime(data.runtime_ms)} · exit code ${data.exit_code ?? (failed ? 1 : 0)}`
                        : (data.status ?? "Error"),
                error: failed,
            });
        } catch {
            fail(0);
        } finally {
            setBusy(null);
        }
    };

    const submit = async () => {
        setBusy("submit");
        try {
            const { ok, status, data } = await demo_submit({ lang, code });
            if (!ok || !data.verdict) return fail(status, data.error);
            const id = nextId ?? 1;
            setNextId(id + 1);
            setSlip({
                id,
                verdict: verdictShort(data.verdict),
                tests: `${data.passed ?? 0} of ${data.total ?? 0} tests`,
                time: slipTime(data.verdict, data.runtime_ms ?? null),
            });
        } catch {
            fail(0);
        } finally {
            setBusy(null);
        }
    };

    const rows = slip ?? { id: nextId, verdict: "Waiting for a run", tests: "—", time: "—" };

    return (
        <div
            className="room ui"
            data-ui="editor"
            style={{
                background: "var(--raised)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                padding: "48px 32px",
                minWidth: 0,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 560,
                    background: "var(--code)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    overflow: "hidden",
                }}
            >
                <div
                    className="room-title"
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px 0", background: "var(--sheet)", flexWrap: "wrap" }}
                >
                    <span style={{ fontSize: 16, fontWeight: 600 }}>Sum of Two Numbers</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                        <span style={{ width: 10, height: 14, borderRadius: 2, background: "var(--roast-light)" }} />
                        Light roast
                    </span>
                </div>
                <Tabs value={lang} onValueChange={(v) => setLang(String(v))} className="gap-0">
                    <TabsList
                        aria-label="Language"
                        className="gap-5 border-b px-[18px] pt-2.5 max-md:gap-4" /* taste-skill-ignore: inside the data-ui editor fragment */
                        style={{ background: "var(--sheet)" }}
                    >
                        {TABS.map((t) => (
                            <TabsTrigger key={t.value} value={t.value} className="h-[34px] text-[14px]" title={LANGUAGE_LABEL[t.value]}>
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="hero-code-wrap" style={{ display: "flex", padding: "16px 18px", overflowX: "auto" }}>
                    <pre aria-hidden style={{ ...codeBox, color: "var(--muted)", paddingRight: 14, userSelect: "none" }}>
                        {lines.map((_, i) => `${i + 1}\n`).join("")}
                    </pre>
                    <div style={{ position: "relative", minWidth: "max-content", flex: 1 }}>
                        <pre aria-hidden style={{ ...codeBox, color: "var(--text)" }}>
                            {highlight(code, lang)}
                            {"\n"}
                        </pre>
                        <textarea
                            aria-label={`Code, ${LANGUAGE_LABEL[lang]}`}
                            value={code}
                            onChange={(e) => setCodes((c) => ({ ...c, [lang]: e.target.value }))}
                            spellCheck={false}
                            wrap="off"
                            style={{
                                ...codeBox,
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                resize: "none",
                                overflow: "hidden",
                                border: 0,
                                outline: "none",
                                background: "transparent",
                                color: "transparent",
                                caretColor: "var(--text)",
                            }}
                        />
                    </div>
                </div>

                <div
                    className="hero-controls"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 18px",
                        background: "var(--sheet)",
                        borderTop: "1px solid var(--border)",
                        flexWrap: "wrap",
                    }}
                >
                    <label htmlFor="hero-input" style={{ fontSize: 14, color: "var(--muted)" }}>
                        Input
                    </label>
                    <input
                        id="hero-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        style={{
                            ...mono,
                            width: 120,
                            height: 36,
                            boxSizing: "border-box",
                            padding: "0 10px",
                            border: "1px solid var(--control)",
                            borderRadius: 6,
                            background: "var(--sheet)",
                            color: "var(--text)",
                            fontSize: 13,
                        }}
                    />
                    <span style={{ flex: 1 }} />
                    <button type="button" className="btn btn-secondary" onClick={run} disabled={busy !== null}>
                        {busy === "run" ? "Running" : "Run"}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={submit} disabled={busy !== null}>
                        {busy === "submit" ? "Judging" : "Submit"}
                    </button>
                </div>

                {out && (
                    <div style={{ padding: "12px 18px 14px", background: "var(--sheet)", borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 13, color: "var(--muted)" }}>Output</div>
                        <div style={{ ...mono, fontSize: 13, marginTop: 4, color: out.error ? "var(--negative)" : "var(--text)", whiteSpace: "pre-wrap" }}>
                            {out.text}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{out.note}</div>
                    </div>
                )}
            </div>

            <div aria-live="polite" className="slip-box" style={{ width: 300, maxWidth: "100%", minHeight: 150 }}>
                <motion.div
                    key={slip ? slip.id : "blank"}
                    initial={reduce || !slip ? false : { y: -48, opacity: 0, rotate: -5, scaleY: 0.86 }}
                    animate={{ y: 0, opacity: 1, rotate: -2, scaleY: 1 }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 22 }}
                    style={{
                        transformOrigin: "top center",
                        background: "var(--paper)",
                        color: "var(--paper-ink)",
                        padding: "18px 20px 20px",
                        boxSizing: "border-box",
                        fontSize: 15,
                        lineHeight: 1.6,
                    }}
                >
                    <div style={{ fontWeight: 700 }}>Submission {rows.id != null ? `#${rows.id}` : ""}</div>
                    <div aria-hidden style={{ color: "#615a52", letterSpacing: ".1em" }}>
                        - - - - - - - - - - - - - - - -
                    </div>
                    <div className="slip-full">Sum of Two Numbers</div>
                    <div className="slip-full">{LANGUAGE_LABEL[lang]}</div>
                    <div className="slip-full" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{rows.verdict}</span>
                        <span className="num">{rows.tests}</span>
                    </div>
                    <div className="slip-full" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Run time</span>
                        <span className="num">{rows.time}</span>
                    </div>
                    <div className="slip-phone">
                        <span>{rows.verdict}</span>
                        <span className="num">
                            {slip ? `${rows.tests.replace(" tests", "")} · ${rows.time}` : ""}
                        </span>
                    </div>
                </motion.div>
            </div>
            <p className="room-hint" style={{ margin: 0, fontSize: 15, color: "var(--muted)", textAlign: "center" }}>
                Change the input, then press Run or Submit. Practice runs are not saved.
            </p>
        </div>
    );
}
