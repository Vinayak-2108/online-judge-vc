import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Runtime from "../components/Runtime";
import SortHeader, { StaticHeader, nextSort, type SortDir } from "../components/SortHeader";
import VerdictPill from "../components/VerdictPill";
import { get_all_submissions, get_submission_summary } from "../controllers/SubmissionRoutes";
import { useAuth } from "../lib/auth";
import {
    formatTests,
    LANGUAGE_LABEL,
    LANGUAGES,
    relativeTime,
    runtimeFor,
    TIME_LIMIT_S,
    VERDICT_OPTIONS,
    verdictKind,
    verdictLabel,
    type VerdictKind,
} from "../lib/format";
import { useElementWidth } from "../lib/useElementWidth";
import { useIsDesktop } from "../lib/useIsDesktop";
import type { Submission, SubmissionSummary } from "../types";

const PAGE = 50;
const WEEK_MS = 7 * 24 * 3600 * 1000;

type Scope = "mine" | "everyone";
type SortKey = "id" | "problem" | "tests" | "runtime" | "time";

const ratio = (s: Submission) => (s.passed == null || !s.total ? null : s.passed / s.total);
const when = (s: Submission) => Date.parse(s.submission_time);

function compare(a: Submission, b: Submission, key: SortKey, dir: SortDir): number {
    const sign = dir === "asc" ? 1 : -1;
    const numeric = (x: number | null, y: number | null) => {
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x - y) * sign;
    };
    switch (key) {
        case "id":
            return (a.id - b.id) * sign;
        case "problem":
            return a.problem.localeCompare(b.problem) * sign;
        case "tests":
            return numeric(ratio(a), ratio(b));
        case "runtime":
            return numeric(a.runtime_ms, b.runtime_ms);
        case "time":
            return (when(a) - when(b)) * sign;
    }
}

const lang = (s: Submission) => LANGUAGE_LABEL[s.language] ?? s.language;

function reason(s: Submission): string {
    const tc = /tc (\d+)/.exec(s.verdict)?.[1];
    switch (verdictKind(s.verdict)) {
        case "time":
            return `hit the ${TIME_LIMIT_S} s time limit`;
        case "compile":
            return "did not compile";
        case "runtime":
            return tc ? `crashed on test ${tc}` : "crashed";
        default:
            return tc ? `gave a wrong answer on test ${tc}` : "gave a wrong answer";
    }
}

function spanText(ms: number): string {
    const mins = Math.max(1, Math.round(ms / 60000));
    if (mins < 60) return `${mins} ${mins === 1 ? "minute" : "minutes"}`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    const days = Math.round(hours / 24);
    return `${days} ${days === 1 ? "day" : "days"}`;
}

/** The newest failed submission whose problem has not been accepted since, with the failures since then. */
export function pendingFailure(rows: Submission[]): { latest: Submission; failures: Submission[] } | null {
    const byTime = [...rows].sort((a, b) => when(b) - when(a));
    const latest = byTime.find((s) => verdictKind(s.verdict) !== "accepted");
    if (!latest) return null;
    const samePlace = (s: Submission) => (latest.question != null ? s.question === latest.question : s.problem === latest.problem);
    const failures: Submission[] = [];
    for (const s of byTime) {
        if (!samePlace(s) || when(s) > when(latest)) continue;
        if (verdictKind(s.verdict) === "accepted") break; // solved after these
        failures.push(s);
    }
    // Something accepted later than the latest failure means it is no longer outstanding.
    if (byTime.some((s) => samePlace(s) && when(s) > when(latest) && verdictKind(s.verdict) === "accepted")) return null;
    return { latest, failures };
}

/** The sentence under the title, built from the caller's own submissions. */
export function submissionsSentence(rows: Submission[], now: Date = new Date()): string {
    const week = rows.filter((s) => now.getTime() - when(s) <= WEEK_MS);
    if (!week.length) return "No submissions in the last 7 days. Pick something from the menu.";
    const accepted = week.filter((s) => verdictKind(s.verdict) === "accepted").length;
    const base = `This week: ${week.length} ${week.length === 1 ? "submission" : "submissions"}, ${
        accepted === week.length && week.length > 1 ? "all" : accepted
    } accepted.`;
    const pending = pendingFailure(week);
    if (!pending) {
        const last = [...week].sort((a, b) => when(b) - when(a))[0];
        return `${base} Latest: ${last.problem} ${verdictKind(last.verdict) === "accepted" ? "accepted" : "submitted"} ${relativeTime(last.submission_time, now)}.`;
    }
    const { latest, failures } = pending;
    const k = failures.length;
    if (k >= 2) {
        const span = now.getTime() - when(failures[k - 1]);
        const times = k === 2 ? "twice" : `${k} times`;
        return `${base} ${latest.problem} failed ${times} in the last ${spanText(span)}; the earlier run ${reason(failures[1])}.`;
    }
    return `${base} ${latest.problem} failed once: the run ${reason(latest)}.`;
}

const Submissions = () => {
    const { user, ready } = useAuth();
    const isDesktop = useIsDesktop();
    const [rootRef, width] = useElementWidth<HTMLDivElement>();
    const [scope, setScope] = useState<Scope | null>(null);
    const [result, setResult] = useState<{ scope: Scope; rows: Submission[]; more: boolean } | null>(null);
    const [mineRows, setMineRows] = useState<Submission[]>([]);
    const [summary, setSummary] = useState<SubmissionSummary | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "time", dir: "desc" });
    const [verdictFilter, setVerdictFilter] = useState<"any" | VerdictKind>("any");
    const [langFilter, setLangFilter] = useState("any");

    // Default to the viewer's own submissions when signed in, everyone's otherwise.
    const active: Scope | null = scope ?? (ready ? (user ? "mine" : "everyone") : null);
    const needsLogin = active === "mine" && !user;

    useEffect(() => {
        if (!ready) return;
        let live = true;
        get_submission_summary()
            .then((s) => live && setSummary(s))
            .catch(() => {});
        if (user) {
            get_all_submissions({ mine: true, limit: 100 })
                .then((rows) => live && setMineRows(rows))
                .catch(() => {});
        }
        return () => {
            live = false;
        };
    }, [ready, user]);

    useEffect(() => {
        if (!active || needsLogin) return;
        let live = true;
        get_all_submissions({ mine: active === "mine", limit: PAGE })
            .then((page) => live && setResult({ scope: active, rows: page, more: page.length === PAGE }))
            .catch(() => live && setResult({ scope: active, rows: [], more: false }));
        return () => {
            live = false;
        };
    }, [active, needsLogin]);

    const current = result && result.scope === active ? result : null;
    const rows = useMemo(() => current?.rows ?? [], [current]);
    const more = current?.more ?? false;
    const loading = !needsLogin && !!active && !current;

    const loadMore = async () => {
        if (!active) return;
        setLoadingMore(true);
        try {
            const page = await get_all_submissions({ mine: active === "mine", limit: PAGE, offset: rows.length });
            setResult((r) => (r ? { ...r, rows: [...r.rows, ...page], more: page.length === PAGE } : r));
        } finally {
            setLoadingMore(false);
        }
    };

    const filtered = useMemo(
        () =>
            rows.filter(
                (s) => (verdictFilter === "any" || verdictKind(s.verdict) === verdictFilter) && (langFilter === "any" || s.language === langFilter),
            ),
        [rows, verdictFilter, langFilter],
    );
    const sorted = useMemo(() => [...filtered].sort((a, b) => compare(a, b, sort.key, sort.dir)), [filtered, sort]);
    const sortProps = (key: SortKey, natural: SortDir = "asc") => ({
        active: sort.key === key,
        dir: sort.dir,
        onSort: () => setSort((s) => nextSort(s, key, natural)),
    });

    const now = new Date();
    const showUser = active === "everyone";
    // Lay out by the sheet's own width: two-line rows when narrow, the table without Language when middling, all columns when wide.
    const mode: "list" | "mid" | "full" = width < (showUser ? 900 : 780) ? "list" : width < 1190 ? "mid" : "full";
    const shown = needsLogin ? [] : sorted;
    const allInWeek = shown.length > 0 && shown.every((s) => now.getTime() - when(s) <= WEEK_MS);
    const sortCaption =
        sort.key === "time"
            ? sort.dir === "desc"
                ? "Newest first"
                : "Oldest first"
            : `Sorted by ${{ id: "submission", problem: "problem", tests: "tests", runtime: "runtime" }[sort.key]}`;

    const mineSentence = useMemo(() => submissionsSentence(mineRows), [mineRows]);
    const pending = useMemo(() => pendingFailure(mineRows), [mineRows]);
    const retry = pending && user ? pending.latest : null;
    const subtitle =
        active === "everyone" || !user ? "The latest submissions from every brewer." : mineSentence;

    const VERDICT_ITEMS: Record<string, string> = {
        any: "Any verdict",
        ...Object.fromEntries(VERDICT_OPTIONS.map((k) => [k, verdictLabel(k)])),
    };
    const LANG_ITEMS: Record<string, string> = { any: "Any language", ...LANGUAGE_LABEL };

    return (
        <div ref={rootRef} className="flex w-full flex-col gap-3.5 px-4 pt-4 pb-8 md:gap-0 md:px-8 md:pt-7">
            <div className={`flex flex-col gap-3 md:mb-5 ${mode === "list" ? "" : "md:flex-row md:items-start md:justify-between md:gap-6"}`}>
                <div className="min-w-0">
                    <h1 className="m-0 text-[22px] leading-8 font-semibold tracking-[-0.01em] md:text-2xl">Submissions</h1>
                    <p className="mt-1 mb-0 text-[14px] leading-[1.45] text-muted-ink">{subtitle}</p>
                </div>
                {retry && (
                    <Link
                        to={`/problems/${retry.problem_slug ?? ""}`}
                        className="flex h-11 w-fit shrink-0 items-center justify-center rounded-control bg-primary px-4 text-[15px] font-medium text-primary-foreground no-underline hover:opacity-90 max-md:w-full md:mt-2 md:h-9 md:text-[14px]"
                    >
                        Retry {retry.problem}
                    </Link>
                )}
            </div>

            <Tabs value={active ?? "everyone"} onValueChange={(v) => setScope(v as Scope)}>
                <TabsList aria-label="Whose submissions" className="gap-6 md:h-10">
                    <TabsTrigger value="mine" className="md:h-10 md:text-[15px]">
                        Mine{" "}
                        {summary?.mine != null && <span className="font-normal text-muted-ink tabular-nums">{summary.mine}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="everyone" className="md:h-10 md:text-[15px]">
                        Everyone{" "}
                        {summary && <span className="font-normal text-muted-ink tabular-nums">{summary.everyone}</span>}
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {isDesktop && !needsLogin && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Select value={verdictFilter} onValueChange={(v) => setVerdictFilter((v ?? "any") as "any" | VerdictKind)} items={VERDICT_ITEMS}>
                        <SelectTrigger aria-label="Filter by verdict" className="h-[34px] w-[160px] bg-sheet text-[15px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(VERDICT_ITEMS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={langFilter} onValueChange={(v) => setLangFilter(v ?? "any")} items={LANG_ITEMS}>
                        <SelectTrigger aria-label="Filter by language" className="h-[34px] w-[160px] bg-sheet text-[15px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {["any", ...LANGUAGES].map((key) => (
                                <SelectItem key={key} value={key}>
                                    {LANG_ITEMS[key]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="m-0 ml-auto text-[14px] text-muted-ink">
                        {shown.length} {shown.length === 1 ? "submission" : "submissions"}
                        {allInWeek ? " in the last 7 days" : ""} {"·"} {sortCaption}
                    </p>
                </div>
            )}

            {needsLogin ? (
                <p className="m-0 border-b border-rule py-6 text-[14px] text-muted-ink md:mt-4">
                    <Link to="/signin" className="text-brand underline">
                        Log in
                    </Link>{" "}
                    to see your own submissions.
                </p>
            ) : shown.length === 0 ? (
                <p className="m-0 border-b border-rule py-6 text-[14px] text-muted-ink md:mt-4">
                    {loading || !active ? "Loading submissions" : rows.length ? "No submissions match those filters." : "No submissions yet."}
                </p>
            ) : mode !== "list" ? (
                <Table className="mt-4 table-fixed text-[15px]">
                    <colgroup>
                        <col style={{ width: mode === "full" ? 116 : 96 }} />
                        <col />
                        {showUser && <col style={{ width: 120 }} />}
                        {mode === "full" && <col style={{ width: 142 }} />}
                        <col style={{ width: mode === "full" ? 200 : 140 }} />
                        <col style={{ width: mode === "full" ? 56 : 64 }} />
                        <col style={{ width: mode === "full" ? 120 : 110 }} />
                        <col style={{ width: mode === "full" ? 174 : 134 }} />
                    </colgroup>
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <SortHeader label="Submission" {...sortProps("id", "desc")} />
                            <SortHeader label="Problem" {...sortProps("problem")} />
                            {showUser && <StaticHeader label="By" />}
                            {mode === "full" && <StaticHeader label="Language" />}
                            <StaticHeader label="Verdict" />
                            <SortHeader label="Tests" align="right" {...sortProps("tests", "desc")} />
                            <SortHeader label="Runtime" align="right" {...sortProps("runtime")} />
                            <SortHeader label="Submitted" align="right" {...sortProps("time", "desc")} />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shown.map((s) => (
                            <TableRow key={s.id} className="h-12 border-rule hover:bg-raised">
                                <TableCell className="px-1.5 py-0">
                                    <span className="font-code text-[14px] leading-5 tabular-nums">#{s.id}</span>
                                </TableCell>
                                <TableCell className="px-1.5 py-0">
                                    {s.problem_slug ? (
                                        <Link
                                            to={`/problems/${s.problem_slug}`}
                                            className="rounded-control text-foreground no-underline hover:underline"
                                        >
                                            {s.problem}
                                        </Link>
                                    ) : (
                                        s.problem
                                    )}
                                </TableCell>
                                {showUser && <TableCell className="truncate px-1.5 py-0">{s.user}</TableCell>}
                                {mode === "full" && <TableCell className="px-1.5 py-0 text-muted-ink">{lang(s)}</TableCell>}
                                <TableCell className="px-1.5 py-0">
                                    <VerdictPill verdict={s.verdict} />
                                </TableCell>
                                <TableCell className="px-1.5 py-0 text-right tabular-nums">{formatTests(s.passed, s.total)}</TableCell>
                                <TableCell className="px-1.5 py-0 text-right">
                                    <Runtime text={runtimeFor(s.verdict, s.runtime_ms)} />
                                </TableCell>
                                <TableCell className="px-1.5 py-0 text-right text-muted-ink tabular-nums">
                                    {relativeTime(s.submission_time, now)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <ul className="m-0 -mt-1.5 list-none p-0">
                    {shown.map((s) => (
                        <li key={s.id} className="border-b border-rule py-[7px]">
                            <div className="flex items-center justify-between gap-2 text-[15px] leading-6">
                                <span className="min-w-0">
                                    <span className="mr-2 font-code text-[13px] text-muted-ink">#{s.id}</span>
                                    <span className="font-medium">{s.problem}</span>
                                </span>
                                <VerdictPill verdict={s.verdict} />
                            </div>
                            <div className="text-[13px] leading-[18px] text-muted-ink tabular-nums">
                                {showUser && `${s.user} · `}
                                {lang(s)} · {s.passed != null && s.total != null && `${formatTests(s.passed, s.total)} tests · `}
                                {runtimeFor(s.verdict, s.runtime_ms)} · {relativeTime(s.submission_time, now)}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {more && !needsLogin && active && (
                <div className="mt-4">
                    <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
                        {loadingMore ? "Loading" : "Load more"}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Submissions;
