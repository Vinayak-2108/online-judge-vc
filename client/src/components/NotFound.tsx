import { Link } from "react-router";

/** Shown for an unknown problem or page, with the way back. */
const NotFound = ({ title = "That page is not on the menu.", detail }: { title?: string; detail?: string }) => (
    <div className="flex w-full flex-col items-start gap-2 px-4 pt-10 pb-8 md:px-8" role="alert">
        <h1 className="m-0 text-[22px] leading-8 font-semibold md:text-2xl">{title}</h1>
        {detail && <p className="m-0 text-[14px] text-muted-ink">{detail}</p>}
        <Link to="/problems" className="mt-2 text-[15px] text-brand underline">
            Back to Problems
        </Link>
    </div>
);

export default NotFound;
