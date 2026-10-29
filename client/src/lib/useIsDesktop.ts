import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 768px)";

function subscribe(listener: () => void) {
    const mq = window.matchMedia?.(QUERY);
    mq?.addEventListener("change", listener);
    return () => mq?.removeEventListener("change", listener);
}

/** True at the md breakpoint and up. Desktop when matchMedia is unavailable (tests). */
export function useIsDesktop(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia?.(QUERY).matches ?? true,
        () => true,
    );
}
