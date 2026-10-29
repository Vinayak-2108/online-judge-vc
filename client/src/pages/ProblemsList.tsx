import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoastMark, { RoastSwatch } from "../components/RoastMark";
import SortHeader, { PlainHeader, nextSort, type SortDir } from "../components/SortHeader";
import StatusMark from "../components/StatusMark";
import { get_all_questions } from "../controllers/QuestionRoutes";
import { get_me } from "../controllers/UserRoutes";
import { useAuth } from "../lib/auth";
import { formatPercent, formatRuntime, ROAST_LABEL, ROAST_ORDER } from "../lib/format";
import { useIsDesktop } from "../lib/useIsDesktop";
import type { Me, ProblemStatus, Question, Roast } from "../types";

type TabKey = "all" | "brew" | "solved";
type RoastFilter = "all" | Roast;
type SortKey = "name" | "roast" | "acceptance" | "best";

const ROAST_ITEMS: Record<RoastFilter, string> = {
    all: "All roasts",
    light: ROAST_LABEL.light,
    medium: ROAST_LABEL.medium,
    dark: ROAST_LABEL.dark,
};

const statusOf = (q: Question): ProblemStatus => q.status ?? "new";

/** Rows without a value sort last in either direction. */
function compare(a: Question, b: Question, key: SortKey, dir: SortDir): number {
    const sign = dir === "asc" ? 1 : -1;
    const numeric = (x: number | null | undefined, y: number | null | undefined) => {
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (x - y) * sign;
    };
    switch (key) {
        case "name":
            return a.name.localeCompare(b.name) * sign;
        case "roast":
            return (ROAST_ORDER[a.difficulty] - ROAST_ORDER[b.difficulty]) * sign;
        case "acceptance":
            return numeric(a.acceptance_rate, b.acceptance_rate);
        case "best":
            return numeric(a.best_runtime_ms, b.best_runtime_ms);
    }
}

function roastCounts(questions: Question[], me: Me | null) {
    const counts = {} as Record<Roast, { solved: number; total: number }>;
    for (const r of ["light", "medium", "dark"] as Roast[]) {
        const inRoast = questions.filter((q) => q.difficulty === r);
        counts[r] = {
            solved: me ? me.by_roast[r].solved : inRoast.filter((q) => statusOf(q) === "solved").length,
            total: inRoast.length,
        };
    }
    return counts;
}

function Finding({ questions, me, loggedIn }: { questions: Question[]; me: Me | null; loggedIn: boolean }) {
    if (!questions.length) return null;
    if (!loggedIn) return <>{questions.length} problems on the menu. Log in to keep track of what you have brewed.</>;
    const solved = me ? me.solved : questions.filter((q) => statusOf(q) === "solved").length;
    const untouched = questions.find((q) => statusOf(q) === "new");
    return (
        <>
            {solved} of {questions.length} brewed
            {untouched ? ` · ${untouched.name} untouched` : " · nothing left on the menu"}
        </>
    );
}

const ProblemsList = () => {
    const { user, ready } = useAuth();
    const isDesktop = useIsDesktop();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [me, setMe] = useState<Me | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [tab, setTab] = useState<TabKey>("all");
    const [roast, setRoast] = useState<RoastFilter>("all");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);

    useEffect(() => {
        if (!ready) return;
        let live = true;
        Promise.all([get_all_questions(), user ? get_me().catch(() => null) : Promise.resolve(null)])
            .then(([q, m]) => {
                if (!live) return;
                setQuestions(q);
                setMe(m);
            })
            .catch(() => {})
            .finally(() => live && setLoaded(true));
        return () => {
            live = false;
        };
    }, [ready, user]);

    const toBrew = questions.filter((q) => statusOf(q) !== "solved").length;
    const solvedCount = questions.length - toBrew;
    const continueWith = questions.find((q) => statusOf(q) === "attempted");

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const rows = questions.filter(
            (q) =>
                (tab === "all" || (tab === "solved") === (statusOf(q) === "solved")) &&
                (roast === "all" || q.difficulty === roast) &&
                (!needle || q.name.toLowerCase().includes(needle)),
        );
        if (sort) rows.sort((a, b) => compare(a, b, sort.key, sort.dir));
        return rows;
    }, [questions, tab, roast, search, sort]);

    const counts = roastCounts(questions, me);
    const cells: { label: string; solved: number; total: number; swatch: Roast | null }[] = [
        {
            label: "All roasts",
            solved: Object.values(counts).reduce((n, c) => n + c.solved, 0),
            total: questions.length,
            swatch: null,
        },
        { label: ROAST_LABEL.light, ...counts.light, swatch: "light" },
        { label: ROAST_LABEL.medium, ...counts.medium, swatch: "medium" },
        { label: ROAST_LABEL.dark, ...counts.dark, swatch: "dark" },
    ];
    const BAR: Record<string, string> = {
        light: "bg-roast-light",
        medium: "bg-roast-medium",
        dark: "bg-roast-dark",
        all: "bg-brand",
    };

    const sortProps = (key: SortKey, natural: SortDir = "asc") => ({
        active: sort?.key === key,
        dir: sort?.dir ?? "asc",
        onSort: () => setSort((s) => (s ? nextSort(s, key, natural) : { key, dir: natural })),
    });

    return (
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-3.5 px-4 pt-4 pb-8 md:gap-5 md:px-8 md:pt-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em] md:text-2xl">Problems</h1>
                    <p className="mt-1 mb-0 text-[14px] leading-[1.45] text-muted-ink">
                        <Finding questions={questions} me={me} loggedIn={!!user} />
                    </p>
                </div>
                {continueWith && (
                    <Link
                        to={`/problems/${continueWith.slug}`}
                        className="flex h-11 items-center justify-center rounded-control bg-primary px-4 text-[15px] font-medium text-primary-foreground no-underline hover:opacity-90 md:h-9 md:text-[14px]"
                    >
                        Continue {continueWith.name}
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-card border border-border md:grid-cols-4" aria-label="Brewed by roast" role="group">
                {cells.map((c, i) => {
                    const pct = c.total ? Math.round((c.solved / c.total) * 100) : 0;
                    return (
                        <div
                            key={c.label}
                            className={`flex flex-col gap-1.5 px-3.5 py-3 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t" : ""} md:border-t-0 ${i > 0 ? "md:border-l" : "md:border-l-0"}`}
                        >
                            <span className="flex items-center gap-1.5 text-[13px] text-muted-ink">
                                {c.swatch ? <RoastSwatch roast={c.swatch} /> : <span className="inline-block h-3 w-2" aria-hidden />}
                                {c.label}
                            </span>
                            <span className="text-[14px] text-muted-ink tabular-nums">
                                <span className="text-[22px] font-medium text-foreground">{c.solved}</span> of {c.total}
                            </span>
                            <span className="h-1 rounded-[2px] bg-raised" aria-hidden>
                                <span
                                    className={`block h-1 rounded-[2px] ${BAR[c.swatch ?? "all"]}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </span>
                        </div>
                    );
                })}
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
                <TabsList variant="line" aria-label="Filter problems" className="w-full justify-start gap-[22px] border-b border-border">
                    <TabsTrigger value="all" className="flex-none px-0">
                        All <span className="font-normal text-muted-ink tabular-nums">{questions.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="brew" className="flex-none px-0">
                        To brew <span className="font-normal text-muted-ink tabular-nums">{toBrew}</span>
                    </TabsTrigger>
                    <TabsTrigger value="solved" className="flex-none px-0">
                        Solved <span className="font-normal text-muted-ink tabular-nums">{solvedCount}</span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1 md:max-w-xs">
                    <SearchIcon
                        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-ink"
                        aria-hidden
                    />
                    <Input
                        type="search"
                        aria-label="Search problems"
                        placeholder="Search problems"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 pl-8 text-[14px]"
                    />
                </div>
                <Select<RoastFilter> value={roast} onValueChange={(v) => setRoast(v ?? "all")} items={ROAST_ITEMS}>
                    <SelectTrigger aria-label="Filter by roast" className="h-9 w-[150px] bg-sheet">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(ROAST_ITEMS) as RoastFilter[]).map((key) => (
                            <SelectItem key={key} value={key}>
                                {ROAST_ITEMS[key]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {!loaded ? (
                <p className="m-0 py-6 text-[14px] text-muted-ink">Loading the menu</p>
            ) : visible.length === 0 ? (
                <p className="m-0 border-b border-rule py-6 text-[14px] text-muted-ink">
                    {questions.length ? "No problems match those filters." : "The menu is empty."}
                </p>
            ) : isDesktop ? (
                <Table className="text-[14px]">
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <PlainHeader label="Status" className="w-10" />
                            <SortHeader label="Problem" {...sortProps("name")} />
                            <SortHeader label="Roast" {...sortProps("roast")} />
                            <SortHeader label="Acceptance" align="right" {...sortProps("acceptance", "desc")} />
                            <SortHeader label="Your best" align="right" {...sortProps("best")} />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visible.map((q) => (
                            <TableRow key={q.id} className="border-rule hover:bg-raised">
                                <TableCell className="w-10 pl-3">
                                    <StatusMark status={statusOf(q)} />
                                </TableCell>
                                <TableCell className="px-2 py-3">
                                    <Link
                                        to={`/problems/${q.slug}`}
                                        className="rounded-control font-medium text-foreground no-underline hover:underline"
                                    >
                                        {q.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="px-2">
                                    <RoastMark roast={q.difficulty} />
                                </TableCell>
                                <TableCell className="px-2 text-right tabular-nums">{formatPercent(q.acceptance_rate)}</TableCell>
                                <TableCell className="px-2 text-right font-code text-[13px] tabular-nums">
                                    {formatRuntime(q.best_runtime_ms)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <ul className="m-0 -mt-1.5 list-none p-0">
                    {visible.map((q) => {
                        const status = statusOf(q);
                        const best =
                            q.best_runtime_ms != null
                                ? `your best ${formatRuntime(q.best_runtime_ms)}`
                                : status === "solved"
                                  ? "solved"
                                  : status === "attempted"
                                    ? "attempted, not solved"
                                    : "not tried";
                        return (
                            <li key={q.id}>
                                <Link
                                    to={`/problems/${q.slug}`}
                                    className="flex items-center gap-3 border-b border-rule py-2.5 text-foreground no-underline"
                                >
                                    <StatusMark status={status} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex justify-between gap-2 text-[15px]">
                                            <span className="font-medium">{q.name}</span>
                                            <span className="tabular-nums">{formatPercent(q.acceptance_rate)}</span>
                                        </span>
                                        <span className="mt-0.5 block text-[13px] text-muted-ink">
                                            {ROAST_LABEL[q.difficulty]} · {best}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default ProblemsList;
