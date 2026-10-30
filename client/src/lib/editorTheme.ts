import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import { tokens, type TokenSet } from "./tokens";
import { useTheme } from "./theme";

const CODE_FONT = '"IBM Plex Mono", ui-monospace, monospace'; // taste-skill-ignore: this is literal code

/**
 * Builds an editor theme (chrome + syntax colours) from one token set. The editor sits on the
 * sheet colour, so every syntax colour here is a token that holds 4.5:1 on that surface.
 */
function build(c: TokenSet, dark: boolean): Extension {
    const chrome = EditorView.theme(
        {
            "&": { backgroundColor: c.sheet, color: c.text, height: "100%", fontSize: "14px" },
            ".cm-content": { caretColor: c.text, fontFamily: CODE_FONT, padding: "12px 0" },
            ".cm-scroller": { fontFamily: CODE_FONT, lineHeight: "1.5" },
            ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.text },
            "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
                backgroundColor: dark ? "#3d3d3d" : "#e6dccf",
            },
            ".cm-activeLine": { backgroundColor: "transparent" },
            ".cm-gutters": { backgroundColor: c.sheet, color: c.muted, border: "none" },
            ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 16px" },
            ".cm-activeLineGutter": { backgroundColor: "transparent", color: c.text },
            "&.cm-focused": { outline: "none" },
            ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
                backgroundColor: "transparent",
                outline: `1px solid ${c.control}`,
            },
            ".cm-tooltip": { backgroundColor: c.sheet, border: `1px solid ${c.border}`, color: c.text },
        },
        { dark },
    );

    // Light: brand 4.6, positive 5.5, warning 7+, roast-medium 5.8 on white.
    // Dark: brand 7.8, positive 8, warning 9, roast-light 9.5 on #141414 (roast-medium misses 4.5 there).
    const typeInk = dark ? c["roast-light"] : c["roast-medium"];
    const syntax = HighlightStyle.define([
        { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: c.brand },
        { tag: [t.string, t.special(t.string), t.regexp], color: c.positive },
        { tag: [t.number, t.bool, t.null, t.atom], color: c.warning },
        { tag: [t.comment, t.lineComment, t.blockComment], color: c.muted, fontStyle: "italic" },
        { tag: [t.typeName, t.className, t.namespace], color: typeInk },
        { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName)], color: c.text, fontWeight: "500" },
        { tag: [t.standard(t.variableName), t.standard(t.name)], color: c.brand },
        { tag: [t.meta, t.processingInstruction], color: c.muted },
        { tag: [t.invalid], color: c.negative },
    ]);
    return [chrome, syntaxHighlighting(syntax)];
}

export const codeCafeLight = build(tokens.light, false);
export const codeCafeDark = build(tokens.dark, true);

/** The editor theme for the page's current colour theme. */
export function useEditorTheme(): Extension {
    const [theme] = useTheme();
    return theme === "dark" ? codeCafeDark : codeCafeLight;
}
