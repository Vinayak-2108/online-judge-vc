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
}

/** A sortable column header: a button inside the th, aria-sort on the th. */
const SortHeader = ({ label, active, dir, onSort, align = "left", className = "" }: Props) => (
    <TableHead
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
        className={`h-10 px-2 text-[12px] font-medium text-muted-foreground ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
        <button
            type="button"
            onClick={onSort}
            className={`-mx-1 inline-flex items-center gap-1 rounded-control px-1 py-1 hover:text-foreground ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-foreground" : ""}`}
        >
            {label}
            {active ? (
                dir === "asc" ? <ArrowUpIcon className="size-3" aria-hidden /> : <ArrowDownIcon className="size-3" aria-hidden />
            ) : (
                <span className="size-3" aria-hidden />
            )}
        </button>
    </TableHead>
);

export default SortHeader;

/** A header cell with no sorting; the label is for screen readers only. */
export const PlainHeader = ({ label, className = "" }: { label: string; className?: string }) => (
    <TableHead className={`h-10 px-2 ${className}`}>
        <span className="sr-only">{label}</span>
    </TableHead>
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

/** A header cell with a visible label and no sorting. */
export const StaticHeader = ({ label }: { label: string }) => (
    <TableHead className="h-10 px-2 text-left text-[12px] font-medium text-muted-foreground">{label}</TableHead>
);
