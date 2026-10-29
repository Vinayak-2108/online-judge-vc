import { CoffeeIcon } from "lucide-react";
import { Link } from "react-router";

/** The product mark and name: a cup in the brand colour, then the wordmark in ink. */
const Wordmark = ({ to = "/", className = "" }: { to?: string; className?: string }) => (
    <Link
        to={to}
        className={`inline-flex items-center gap-2 rounded-control text-[16px] font-semibold text-foreground no-underline ${className}`}
    >
        <CoffeeIcon className="size-[18px] text-brand" strokeWidth={2} aria-hidden />
        Code Cafe
    </Link>
);

export default Wordmark;
