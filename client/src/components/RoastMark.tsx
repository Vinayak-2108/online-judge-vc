import type { Roast } from "../types";
import { ROAST_LABEL } from "../lib/format";

const SWATCH: Record<Roast, string> = {
    light: "bg-roast-light",
    medium: "bg-roast-medium",
    dark: "bg-roast-dark",
};

/** The roast mark: a small filled swatch in the roast's brown, always beside its word. */
export const RoastSwatch = ({ roast }: { roast: Roast }) => (
    <span aria-hidden className={`inline-block h-3 w-2 shrink-0 rounded-[2px] ${SWATCH[roast]}`} />
);

const RoastMark = ({ roast, short = false }: { roast: Roast; short?: boolean }) => (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <RoastSwatch roast={roast} />
        {short ? ROAST_LABEL[roast].replace(" roast", "") : ROAST_LABEL[roast]}
    </span>
);

export default RoastMark;
