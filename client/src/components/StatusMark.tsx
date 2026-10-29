import { CheckIcon } from "lucide-react";
import type { ProblemStatus } from "../types";

const LABEL: Record<ProblemStatus, string> = {
    solved: "Solved",
    attempted: "Attempted, not solved",
    new: "Not tried",
};

/** 14px mark: filled = solved, ring with a dot = attempted, empty ring = not tried. Always labelled. */
const StatusMark = ({ status }: { status: ProblemStatus }) => {
    const base = "inline-flex size-[14px] shrink-0 items-center justify-center rounded-full box-border";
    if (status === "solved")
        return (
            <span role="img" aria-label={LABEL.solved} className={`${base} bg-positive text-sheet`}>
                <CheckIcon className="size-[10px]" strokeWidth={3} aria-hidden />
            </span>
        );
    return (
        <span role="img" aria-label={LABEL[status]} className={`${base} border-[1.5px] border-muted-ink`}>
            {status === "attempted" && <span className="size-[4px] rounded-full bg-muted-ink" />}
        </span>
    );
};

export default StatusMark;
