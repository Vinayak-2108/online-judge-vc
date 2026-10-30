import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { TableHead } from "@/components/ui/table";

export type SortDir = "asc" | "desc";

interface Props {
    label: string;
    active: boolean;
    dir: SortDir;
    onSort: () => void;
    align?: "left" | "right";
    className?: string;
    /** Show the direction arrow (false at rest, on the default sort). */
    arrow?: boolean;
}

const HEAD = "h-10 px-1.5 text-[13px] font-normal text-muted-foreground";

/** A plain column header that sorts on click; a small arrow appears only on the sorted column. */
const SortHeader = ({ label, active, dir, onSort, align = "left", className = "", arrow = true }: Props) => (
    <TableHead
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
        className={`${HEAD} ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
        <button
            type="button"
            onClick={onSort}
            className={`-mx-1 inline-flex items-center gap-1 rounded-control px-1 py-1 hover:text-foreground ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-foreground" : ""}`}
        >
            {label}
            {active &&
                arrow &&
                (dir === "asc" ? <ArrowUpIcon className="size-3" aria-hidden /> : <ArrowDownIcon className="size-3" aria-hidden />)}
        </button>
    </TableHead>
);

export default SortHeader;

/** A header cell with no sorting; the label is for screen readers only. */
export const PlainHeader = ({ label, className = "" }: { label: string; className?: string }) => (
    <TableHead className={`${HEAD} ${className}`}>
        <span className="sr-only">{label}</span>
    </TableHead>
);

/** A header cell with a visible label and no sorting. */
export const StaticHeader = ({ label, align = "left", className = "" }: { label: string; align?: "left" | "right"; className?: string }) => (
    <TableHead className={`${HEAD} ${align === "right" ? "text-right" : "text-left"} ${className}`}>{label}</TableHead>
);

/** Toggles direction on the active column, otherwise switches column with its natural direction. */
export function nextSort<K extends string>(
    current: { key: K; dir: SortDir },
    key: K,
    natural: SortDir = "asc",
): { key: K; dir: SortDir } {
    if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    return { key, dir: natural };
}
