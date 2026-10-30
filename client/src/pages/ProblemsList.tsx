import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRightIcon, SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoastMark, { RoastSwatch } from "../components/RoastMark";
import Runtime from "../components/Runtime";
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

/** Rows shown before "Show all N". */
const CAP = 8;

const ROAST_ITEMS: Record<RoastFilter, string> = {
    all: "Any roast",
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

const SORT_CAPTION: Record<SortKey, [string, string]> = {
    name: ["name, A to Z", "name, Z to A"],
    roast: ["roast, light to dark", "roast, dark to light"],
    acceptance: ["acceptance, low to high", "acceptance, high to low"],
    best: ["your best time, fastest first", "your best time, slowest first"],
};

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => WORDS[n] ?? String(n);

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

/** The sentence under the title, generated from the caller's real data. */
export function findingLine(questions: Question[], me: Me | null, loggedIn: boolean, phone = false): string {
    if (!questions.length) return "";
    if (!loggedIn) return `${questions.length} problems on the menu. Log in to keep track of what you have brewed.`;
    const counts = roastCounts(questions, me);
    const solved = me ? me.solved : questions.filter((q) => statusOf(q) === "solved").length;
    const head = `${solved} of ${questions.length} brewed.`;
    const best = (list: Question[]) => [...list].sort((a, b) => (b.acceptance_rate ?? -1) - (a.acceptance_rate ?? -1))[0];

    if (solved === questions.length) return `${head} Every problem on the menu is done.`;
    if (solved === 0) {
        const start = best(questions.filter((q) => q.difficulty === "light")) ?? best(questions);
        return `${head} Start with ${start.name}${start.acceptance_rate != null ? ` (${formatPercent(start.acceptance_rate)} accepted)` : ""}.`;
    }
    // The darkest roast with nothing solved yet: point at its friendliest problem.
    for (const roast of ["dark", "medium", "light"] as Roast[]) {
        const inRoast = questions.filter((q) => q.difficulty === roast);
        if (inRoast.length && counts[roast].solved === 0) {
            const top = best(inRoast);
            const pct = top.acceptance_rate != null ? ` (${formatPercent(top.acceptance_rate)})` : "";
            if (inRoast.length === 1) return `${head} No ${roast} roasts yet: ${top.name} is the only one${pct}.`;
            return phone
                ? `${head} No ${roast} roasts yet: ${top.name} is the friendliest of the ${word(inRoast.length)}${pct}.`
                : `${head} No ${roast} roasts yet: ${top.name} has the highest acceptance of the ${word(inRoast.length)}${pct}.`;
        }
    }
    const attempted = questions.find((q) => statusOf(q) === "attempted");
    if (attempted) return `${head} ${attempted.name} is attempted but not solved yet.`;
    const untouched = questions.find((q) => statusOf(q) === "new");
    return untouched ? `${head} ${untouched.name} is untouched.` : head;
}

const ProblemsList = () => {
    const { user, ready } = useAuth();
    const isDesktop = useIsDesktop();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [me, setMe] = useState<Me | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [tab, setTab] = useState<TabKey>("all");
    const [roast, setRoast] = useState<RoastFilter>("all");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "acceptance", dir: "desc" });
    const [showAll, setShowAll] = useState(false);

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

    const matches = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const rows = questions.filter(
            (q) =>
                (tab === "all" || (tab === "solved") === (statusOf(q) === "solved")) &&
                (roast === "all" || q.difficulty === roast) &&
                (!needle || q.name.toLowerCase().includes(needle)),
        );
        rows.sort((a, b) => compare(a, b, sort.key, sort.dir));
        return rows;
    }, [questions, tab, roast, search, sort]);

    const visible = isDesktop && !showAll ? matches.slice(0, CAP) : matches;
    const sortCaption = SORT_CAPTION[sort.key][sort.dir === "asc" ? 0 : 1];

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
        active: sort.key === key,
        dir: sort.dir,
        onSort: () => setSort((s) => nextSort(s, key, natural)),
    });

    const randomProblem = () => {
        const pool = questions.filter((q) => statusOf(q) !== "solved");
        const from = pool.length ? pool : questions;
        const pick = from[Math.floor(Math.random() * from.length)];
        if (pick) navigate(`/problems/${pick.slug}`);
    };

    const finding = findingLine(questions, me, !!user, !isDesktop);

    return (
        <div className="flex w-full flex-col gap-3.5 px-4 pt-4 pb-8 md:gap-0 md:px-8 md:pt-7">
            <div className="flex flex-col gap-3 md:mb-[29px] md:flex-row md:items-start md:justify-between md:gap-6">
                <div className="min-w-0">
                    <h1 className="m-0 text-[22px] leading-8 font-semibold tracking-[-0.01em] md:text-2xl">Problems</h1>
                    <p className="mt-1 mb-0 text-[14px] leading-[1.45] text-muted-ink">{finding}</p>
                </div>
                <div className="flex shrink-0 gap-2 md:mt-2">
                    {isDesktop && questions.length > 0 && (
                        <button
                            type="button"
                            onClick={randomProblem}
                            className="h-9 rounded-control border border-control bg-sheet px-4 text-[14px] font-medium text-foreground hover:bg-raised"
                        >
                            Random problem
                        </button>
                    )}
                    {continueWith && (
                        <Link
                            to={`/problems/${continueWith.slug}`}
                            className="flex h-11 flex-1 items-center justify-center rounded-control bg-primary px-4 text-[15px] font-medium text-primary-foreground no-underline hover:opacity-90 md:h-9 md:flex-none md:text-[14px]"
                        >
                            Continue {continueWith.name}
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-card border border-border md:grid-cols-4" aria-label="Brewed by roast" role="group">
                {cells.map((c, i) => {
                    const pct = c.total ? Math.round((c.solved / c.total) * 100) : 0;
                    return (
                        <div
                            key={c.label}
                            className={`flex flex-col px-3.5 pt-3 pb-3 md:px-5 md:pt-[18px] md:pb-[19px] ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t" : ""} md:border-t-0 ${i > 0 ? "md:border-l" : "md:border-l-0"}`}
                        >
                            <span className="flex items-center gap-2 text-[13px] leading-5 text-muted-ink md:text-[15px]">
                                {c.swatch ? <RoastSwatch roast={c.swatch} /> : <span className="inline-block h-3 w-2 md:hidden" aria-hidden />}
                                {c.label}
                            </span>
                            <span className="mt-1.5 text-[14px] text-muted-ink tabular-nums md:text-[15px]">
                                <span className="text-[22px] font-medium text-foreground md:text-2xl">{c.solved}</span> of {c.total}
                                {isDesktop && " solved"}
                            </span>
                            <span className="mt-1.5 h-1 rounded-[2px] bg-raised md:mt-[5px]" aria-hidden>
                                <span
                                    className={`block h-1 rounded-[2px] ${BAR[c.swatch ?? "all"]}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </span>
                        </div>
                    );
                })}
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="md:mt-5">
                <TabsList aria-label="Filter problems" className="gap-6 md:h-10">
                    <TabsTrigger value="all" className="md:h-10 md:text-[15px]">
                        All <span className="font-normal text-muted-ink tabular-nums">{questions.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="brew" className="md:h-10 md:text-[15px]">
                        To brew <span className="font-normal text-muted-ink tabular-nums">{toBrew}</span>
                    </TabsTrigger>
                    <TabsTrigger value="solved" className="md:h-10 md:text-[15px]">
                        Solved <span className="font-normal text-muted-ink tabular-nums">{solvedCount}</span>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {isDesktop && (
                <div className="mt-4 flex items-center gap-3">
                    <div className="relative w-[299px]">
                        <SearchIcon
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground"
                            strokeWidth={2.25}
                            aria-hidden
                        />
                        <Input
                            type="search"
                            aria-label="Filter by name"
                            placeholder="Filter by name"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-[34px] pl-9 text-[15px]"
                        />
                    </div>
                    <Select<RoastFilter> value={roast} onValueChange={(v) => setRoast(v ?? "all")} items={ROAST_ITEMS}>
                        <SelectTrigger aria-label="Filter by roast" className="h-[34px] w-[149px] bg-sheet text-[15px]">
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
                    <p className="m-0 ml-auto text-[14px] text-muted-ink">
                        {matches.length} {matches.length === 1 ? "problem" : "problems"} {"·"} Sorted by {sortCaption}
                    </p>
                </div>
            )}

            {!loaded ? (
                <p className="m-0 py-6 text-[14px] text-muted-ink">Loading the menu</p>
            ) : matches.length === 0 ? (
                <p className="m-0 border-b border-rule py-6 text-[14px] text-muted-ink md:mt-4">
                    {questions.length ? "No problems match those filters." : "The menu is empty."}
                </p>
            ) : isDesktop ? (
                <>
                    <Table className="mt-4 table-fixed text-[15px]">
                        <colgroup>
                            <col style={{ width: 40 }} />
                            <col />
                            <col style={{ width: 206 }} />
                            <col style={{ width: 128 }} />
                            <col style={{ width: 128 }} />
                        </colgroup>
                        <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                                <PlainHeader label="Status" />
                                <SortHeader label="Problem" {...sortProps("name")} />
                                <SortHeader label="Roast" {...sortProps("roast")} />
                                <SortHeader label="Acceptance" align="right" {...sortProps("acceptance", "desc")} />
                                <SortHeader label="Your best" align="right" {...sortProps("best")} />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((q) => (
                                <TableRow key={q.id} className="h-12 border-rule hover:bg-raised">
                                    <TableCell className="py-0 pr-0 pl-0.5">
                                        <StatusMark status={statusOf(q)} />
                                    </TableCell>
                                    <TableCell className="px-1.5 py-0">
                                        <Link
                                            to={`/problems/${q.slug}`}
                                            className="rounded-control text-foreground no-underline hover:underline"
                                        >
                                            {q.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="px-1.5 py-0">
                                        <RoastMark roast={q.difficulty} />
                                    </TableCell>
                                    <TableCell className="px-1.5 py-0 text-right tabular-nums">
                                        {formatPercent(q.acceptance_rate)}
                                    </TableCell>
                                    <TableCell className="px-1.5 py-0 text-right">
                                        <Runtime text={formatRuntime(q.best_runtime_ms)} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {matches.length > CAP && !showAll && (
                        <button
                            type="button"
                            onClick={() => setShowAll(true)}
                            className="mt-3 inline-flex h-5 w-fit items-center gap-2 rounded-control text-[15px] text-brand"
                        >
                            Show all {matches.length}
                            <ArrowRightIcon className="size-4" strokeWidth={2.5} aria-hidden />
                        </button>
                    )}
                </>
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
                                    className="flex items-center gap-3 border-b border-rule py-[7px] text-foreground no-underline"
                                >
                                    <StatusMark status={status} phone />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex justify-between gap-2 text-[15px] leading-5">
                                            <span className="font-medium">{q.name}</span>
                                            <span className="tabular-nums">{formatPercent(q.acceptance_rate)}</span>
                                        </span>
                                        <span className="block text-[13px] leading-[18px] text-muted-ink">
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
