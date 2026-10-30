import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { SearchIcon, XIcon } from "lucide-react";

import { get_all_questions } from "../controllers/QuestionRoutes";
import { ROAST_LABEL } from "../lib/format";
import type { Question } from "../types";

let cache: Promise<Question[]> | null = null;
/** The menu is small and rarely changes; fetch it once per page load for quick search. */
const loadQuestions = (): Promise<Question[]> =>
    (cache ??= get_all_questions().catch(() => {
        cache = null;
        return [] as Question[];
    }));

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

export function resetProblemSearchCache() {
    cache = null;
}

interface Props {
    /** "bar": the centred field in the desktop top bar. "icon": the phone's search button. */
    variant: "bar" | "icon";
}

/**
 * Quick problem search and jump: type to filter by name, arrow keys and Enter to open a problem.
 * Ctrl/Cmd+K focuses it from anywhere.
 */
const ProblemSearch = ({ variant }: Props) => {
    const navigate = useNavigate();
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [text, setText] = useState("");
    const [open, setOpen] = useState(false); // result list (bar) or the whole overlay (icon)
    const [active, setActive] = useState(0);
    const [focused, setFocused] = useState(false);

    const needle = text.trim().toLowerCase();
    const results = needle ? questions.filter((q) => q.name.toLowerCase().includes(needle)).slice(0, 6) : questions.slice(0, 6);
    const listOpen = open && (variant === "icon" || focused);

    const ensureLoaded = useCallback(() => {
        loadQuestions().then(setQuestions);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        setText("");
        setActive(0);
    }, []);

    const go = (q: Question) => {
        close();
        inputRef.current?.blur();
        navigate(`/problems/${q.slug}`);
    };

    // Ctrl/Cmd+K from anywhere.
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                // only the instance that is on screen reacts
                const wide = window.matchMedia?.("(min-width: 768px)").matches ?? true;
                if ((variant === "bar") !== wide) return;
                e.preventDefault();
                ensureLoaded();
                setOpen(true);
                // the overlay mounts on the next render
                requestAnimationFrame(() => inputRef.current?.focus());
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [variant, ensureLoaded]);

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === "Enter") {
            const q = results[active];
            if (q) {
                e.preventDefault();
                go(q);
            }
        } else if (e.key === "Escape") {
            close();
            inputRef.current?.blur();
        }
    };

    const field = (
        <div className="relative w-full">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground" strokeWidth={2.25} aria-hidden />
            <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-label="Search problems"
                aria-expanded={listOpen}
                aria-controls={`${id}-list`}
                aria-activedescendant={listOpen && results[active] ? `${id}-opt-${results[active].id}` : undefined}
                aria-autocomplete="list"
                autoComplete="off"
                placeholder="Search problems"
                value={text}
                onFocus={() => {
                    setFocused(true);
                    setOpen(true);
                    ensureLoaded();
                }}
                onBlur={() => {
                    setFocused(false);
                    // let a click on a result land first
                    setTimeout(() => variant === "bar" && setOpen(false), 120);
                }}
                onChange={(e) => {
                    setText(e.target.value);
                    setActive(0);
                    setOpen(true);
                }}
                onKeyDown={onKeyDown}
                className="h-[30px] w-full rounded-control border border-border bg-sheet pr-14 pl-9 text-[14px] text-foreground outline-none placeholder:text-muted-ink focus-visible:ring-2 focus-visible:ring-ring md:h-[30px]"
            />
            {variant === "bar" && !text && !focused && (
                <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded-[4px] bg-raised px-1.5 py-0.5 font-sans text-[12px] text-muted-ink">
                    {isMac() ? "⌘ K" : "Ctrl K"}
                </kbd>
            )}
            {listOpen && (
                <ul
                    id={`${id}-list`}
                    role="listbox"
                    aria-label="Problems"
                    className="absolute top-[calc(100%+4px)] right-0 left-0 z-50 m-0 list-none overflow-hidden rounded-card border border-border bg-sheet p-1"
                >
                    {results.length === 0 ? (
                        <li className="px-3 py-2 text-[14px] text-muted-ink">No problem by that name.</li>
                    ) : (
                        results.map((q, i) => (
                            <li
                                key={q.id}
                                id={`${id}-opt-${q.id}`}
                                role="option"
                                aria-selected={i === active}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => go(q)}
                                onMouseEnter={() => setActive(i)}
                                className={`flex cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2 text-[14px] text-foreground ${i === active ? "bg-raised" : ""}`}
                            >
                                <span className="truncate">{q.name}</span>
                                <span className="shrink-0 text-[13px] text-muted-ink">{ROAST_LABEL[q.difficulty]}</span>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );

    if (variant === "bar") return <div className="w-full max-w-[439px]">{field}</div>;

    return (
        <>
            <button
                type="button"
                aria-label="Search problems"
                onClick={() => {
                    ensureLoaded();
                    setOpen(true);
                    requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="flex size-11 items-center justify-center rounded-control text-foreground"
            >
                <SearchIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
            {open && (
                <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-1 bg-frame px-3">
                    <div className="flex-1">{field}</div>
                    <button
                        type="button"
                        aria-label="Close search"
                        onClick={close}
                        className="flex size-11 items-center justify-center rounded-control text-foreground"
                    >
                        <XIcon className="size-[18px]" aria-hidden />
                    </button>
                </div>
            )}
        </>
    );
};

export default ProblemSearch;
