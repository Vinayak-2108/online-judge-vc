import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "theme";
const listeners = new Set<() => void>();

function stored(): Theme | null {
    try {
        const value = localStorage.getItem(KEY);
        return value === "light" || value === "dark" ? value : null;
    } catch {
        return null;
    }
}

function systemTheme(): Theme {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The theme currently applied to <html> (set before first paint by the inline script in index.html). */
export function getTheme(): Theme {
    const attr = document.documentElement.dataset.theme;
    return attr === "light" || attr === "dark" ? attr : stored() ?? systemTheme();
}

function apply(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    listeners.forEach((l) => l());
}

/** Applies and remembers the user's choice. */
export function setTheme(theme: Theme) {
    apply(theme);
    try {
        localStorage.setItem(KEY, theme);
    } catch {
        // private mode or blocked storage: the choice just lasts for this page view
    }
}

/** Without a saved choice, follow the system setting as it changes. */
export function followSystem() {
    const query = window.matchMedia?.("(prefers-color-scheme: dark)");
    query?.addEventListener("change", () => {
        if (!stored()) apply(systemTheme());
    });
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useTheme(): [Theme, (theme: Theme) => void] {
    const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
    return [theme, setTheme];
}
