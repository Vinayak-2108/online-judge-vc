import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SortHeader, { StaticHeader, nextSort, type SortDir } from "../components/SortHeader";
import VerdictPill from "../components/VerdictPill";
import { get_all_submissions } from "../controllers/SubmissionRoutes";
import { useAuth } from "../lib/auth";
import { formatRuntime, formatTests, formatWhen, LANGUAGE_LABEL } from "../lib/format";
import { useIsDesktop } from "../lib/useIsDesktop";
import type { Submission } from "../types";

const PAGE = 50;

type Scope = "mine" | "everyone";
type SortKey = "id" | "problem" | "tests" | "runtime" | "time";

const ratio = (s: Submission) => (s.passed == null || !s.total ? null : s.passed / s.total);

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
            return (Date.parse(a.submission_time) - Date.parse(b.submission_time)) * sign;
    }
}

const lang = (s: Submission) => LANGUAGE_LABEL[s.language] ?? s.language;

const Submissions = () => {
    const { user, ready } = useAuth();
    const isDesktop = useIsDesktop();
    const [scope, setScope] = useState<Scope | null>(null);
    const [result, setResult] = useState<{ scope: Scope; rows: Submission[]; more: boolean } | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "time", dir: "desc" });

    // Default to the viewer's own submissions when signed in, everyone's otherwise.
    const active: Scope | null = scope ?? (ready ? (user ? "mine" : "everyone") : null);
    const needsLogin = active === "mine" && !user;

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

    const sorted = useMemo(() => [...rows].sort((a, b) => compare(a, b, sort.key, sort.dir)), [rows, sort]);
    const sortProps = (key: SortKey, natural: SortDir = "asc") => ({
        active: sort.key === key,
        dir: sort.dir,
        onSort: () => setSort((s) => nextSort(s, key, natural)),
    });

    const showUser = active === "everyone";
    const shown = needsLogin ? [] : sorted;

    return (
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-3.5 px-4 pt-4 pb-8 md:gap-5 md:px-8 md:pt-8">
            <div>
                <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em] md:text-2xl">Submissions</h1>
                <p className="mt-1 mb-0 text-[14px] leading-[1.45] text-muted-ink">
                    {active === "everyone" ? "The latest submissions from every brewer." : "How your recent submissions did."}
                </p>
            </div>

            <Tabs
                value={active ?? "everyone"}
                onValueChange={(v) => setScope(v as Scope)}
            >
                <TabsList variant="line" aria-label="Whose submissions" className="w-full justify-start gap-[22px] border-b border-border">
                    <TabsTrigger value="mine" className="flex-none px-0">
                        Mine
                    </TabsTrigger>
                    <TabsTrigger value="everyone" className="flex-none px-0">
                        Everyone
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {needsLogin ? (
                <p className="m-0 border-b border-rule py-6 text-[14px] text-muted-ink">
                    <Link to="/signup" className="text-brand underline">
                        Log in
                    </Link>{" "}
                    to see your own submissions.
                </p>
            ) : shown.length === 0 ? (
                <p className="m-0 border-b border-rule py-6 text-[14px] text-muted-ink">
                    {loading || !active ? "Loading submissions" : "No submissions yet."}
                </p>
            ) : isDesktop ? (
                <Table className="text-[14px]">
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <SortHeader label="Submission" {...sortProps("id", "desc")} />
                            <SortHeader label="Problem" {...sortProps("problem")} />
                            {showUser && <StaticHeader label="By" />}
                            <StaticHeader label="Language" />
                            <StaticHeader label="Verdict" />
                            <SortHeader label="Tests" align="right" {...sortProps("tests", "desc")} />
                            <SortHeader label="Runtime" align="right" {...sortProps("runtime")} />
                            <SortHeader label="Time" align="right" {...sortProps("time", "desc")} />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shown.map((s) => (
                            <TableRow key={s.id} className="border-rule hover:bg-raised">
                                <TableCell className="px-3 py-3 font-code text-[13px] tabular-nums">#{s.id}</TableCell>
                                <TableCell className="px-2">
                                    {s.problem_slug ? (
                                        <Link
                                            to={`/problems/${s.problem_slug}`}
                                            className="rounded-control font-medium text-foreground no-underline hover:underline"
                                        >
                                            {s.problem}
                                        </Link>
                                    ) : (
                                        s.problem
                                    )}
                                </TableCell>
                                {showUser && <TableCell className="px-2">{s.user}</TableCell>}
                                <TableCell className="px-2">{lang(s)}</TableCell>
                                <TableCell className="px-2">
                                    <VerdictPill verdict={s.verdict} />
                                </TableCell>
                                <TableCell className="px-2 text-right tabular-nums">{formatTests(s.passed, s.total)}</TableCell>
                                <TableCell className="px-2 text-right font-code text-[13px] tabular-nums">
                                    {formatRuntime(s.runtime_ms)}
                                </TableCell>
                                <TableCell className="px-2 text-right text-muted-ink tabular-nums">
                                    {formatWhen(s.submission_time)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <ul className="m-0 -mt-1.5 list-none p-0">
                    {shown.map((s) => (
                        <li key={s.id} className="border-b border-rule py-2.5">
                            <div className="flex items-center justify-between gap-2 text-[15px]">
                                <span className="min-w-0">
                                    <span className="mr-2 font-code text-[13px] tabular-nums text-muted-ink">#{s.id}</span>
                                    <span className="font-medium">{s.problem}</span>
                                </span>
                                <VerdictPill verdict={s.verdict} />
                            </div>
                            <div className="mt-0.5 text-[13px] text-muted-ink tabular-nums">
                                {showUser && `${s.user} · `}
                                {lang(s)} · {formatTests(s.passed, s.total)} tests · {formatRuntime(s.runtime_ms)} ·{" "}
                                {formatWhen(s.submission_time)}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {more && !needsLogin && active && (
                <div>
                    <Button variant="outline" disabled={loadingMore} onClick={loadMore}>
                        {loadingMore ? "Loading" : "Load more"}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Submissions;
