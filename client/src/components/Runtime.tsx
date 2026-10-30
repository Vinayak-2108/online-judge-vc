import { DASH } from "../lib/format";

/** A runtime in mono; the unknown dash stays in the text face so every row keeps one height and glyph. */
const Runtime = ({ text }: { text: string }) =>
    text === DASH ? <span>{DASH}</span> : <span className="font-code text-[14px] leading-5 tabular-nums">{text}</span>;

export default Runtime;
