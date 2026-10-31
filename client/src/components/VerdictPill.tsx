import { Badge } from "@/components/ui/badge";
import { verdictShort, verdictTone, type VerdictTone } from "../lib/format";

const TONE: Record<VerdictTone, string> = {
    positive: "bg-positive-bg text-positive",
    negative: "bg-negative-bg text-negative",
    warning: "bg-warning-bg text-warning",
};

/** A short verdict pill (Accepted, Wrong answer, ...); the server's full string is its tooltip. */
const VerdictPill = ({ verdict }: { verdict: string }) => (
    <Badge title={verdict} className={`h-6 border-transparent px-2.5 text-[13px] font-medium ${TONE[verdictTone(verdict)]}`}>
        {verdictShort(verdict)}
    </Badge>
);

export default VerdictPill;
