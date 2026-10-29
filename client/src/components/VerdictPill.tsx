import { Badge } from "@/components/ui/badge";
import { verdictTone, type VerdictTone } from "../lib/format";

const TONE: Record<VerdictTone, string> = {
    positive: "bg-positive-bg text-positive",
    negative: "bg-negative-bg text-negative",
    warning: "bg-warning-bg text-warning",
};

/** A verdict pill: pale tint with dark text of the same hue. */
const VerdictPill = ({ verdict }: { verdict: string }) => (
    <Badge className={`border-transparent px-2 text-[12px] font-medium ${TONE[verdictTone(verdict)]}`}>{verdict}</Badge>
);

export default VerdictPill;
