import { CircleDotIcon, CircleCheckIcon, CircleIcon } from "lucide-react";
import type { ProblemStatus } from "../types";

const LABEL: Record<ProblemStatus, string> = {
    solved: "Solved",
    attempted: "Attempted, not solved",
    new: "Not tried",
};

/**
 * Desktop: a ring with a check (solved), a ring with a dot (attempted), a faint ring (not tried).
 * Phone: a solid dot (solved), an outline ring (attempted), a faint ring (not tried).
 * Always labelled.
 */
const StatusMark = ({ status, phone = false }: { status: ProblemStatus; phone?: boolean }) => {
    if (phone) {
        const base = "inline-block size-[14px] shrink-0 rounded-full box-border";
        const cls =
            status === "solved"
                ? "bg-positive"
                : status === "attempted"
                  ? "border-[1.5px] border-muted-ink"
                  : "border-[1.5px] border-faint";
        return <span role="img" aria-label={LABEL[status]} className={`${base} ${cls}`} />;
    }
    const Icon = status === "solved" ? CircleCheckIcon : status === "attempted" ? CircleDotIcon : CircleIcon;
    const color = status === "solved" ? "text-positive" : status === "attempted" ? "text-muted-ink" : "text-faint";
    return <Icon role="img" aria-label={LABEL[status]} className={`size-[17px] shrink-0 ${color}`} strokeWidth={2} />;
};

export default StatusMark;
