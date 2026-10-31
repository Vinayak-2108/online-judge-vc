import { useEffect, useState } from "react";

/**
 * The live width of an element (a container query in code): returns [ref callback, width].
 * `fallback` is used until the first measurement and where ResizeObserver is missing (tests).
 */
export function useElementWidth<T extends HTMLElement>(fallback = 1200): [(el: T | null) => void, number] {
    const [el, setEl] = useState<T | null>(null);
    const [width, setWidth] = useState(fallback);

    useEffect(() => {
        if (!el || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver((entries) => {
            const box = entries[0]?.borderBoxSize?.[0]?.inlineSize ?? el.getBoundingClientRect().width;
            setWidth(Math.round(box));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [el]);

    return [setEl, width];
}
