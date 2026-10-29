import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import { tokens, type TokenSet } from "./tokens";
import { useTheme } from "./theme";

/** Builds an editor theme (chrome + syntax colours) from one token set. */
function build(c: TokenSet, dark: boolean): Extension {
    const chrome = EditorView.theme(
        {
            "&": { backgroundColor: c.sheet, color: c.text, height: "100%" },
            ".cm-content": { caretColor: c.text, fontFamily: '"IBM Plex Mono", ui-monospace, monospace' },
            ".cm-scroller": { fontFamily: '"IBM Plex Mono", ui-monospace, monospace', lineHeight: "1.6" },
            ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.text },
            "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
                backgroundColor: dark ? "#3d3d3d" : "#e6dccf",
            },
            ".cm-activeLine": { backgroundColor: c.raised },
            ".cm-gutters": { backgroundColor: c.sheet, color: c.muted, border: "none" },
            ".cm-activeLineGutter": { backgroundColor: c.raised, color: c.text },
            "&.cm-focused": { outline: "none" },
            ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
                backgroundColor: "transparent",
                outline: `1px solid ${c.control}`,
            },
            ".cm-tooltip": { backgroundColor: c.sheet, border: `1px solid ${c.border}`, color: c.text },
        },
        { dark },
    );

    const syntax = HighlightStyle.define([
        { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: c.brand },
        { tag: [t.string, t.special(t.string), t.regexp], color: c.positive },
        { tag: [t.number, t.bool, t.null, t.atom], color: c.warning },
        { tag: [t.comment, t.lineComment, t.blockComment], color: c.muted, fontStyle: "italic" },
        { tag: [t.typeName, t.className, t.namespace], color: c["roast-medium"] },
        { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName)], color: c.text, fontWeight: "500" },
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
