import { useSyncExternalStore } from "react";

/** Live matchMedia; `fallback` is the answer where matchMedia is unavailable (tests, SSR). */
export function useMediaQuery(query: string, fallback = true): boolean {
    return useSyncExternalStore(
        (listener) => {
            const mq = window.matchMedia?.(query);
            mq?.addEventListener("change", listener);
            return () => mq?.removeEventListener("change", listener);
        },
        () => window.matchMedia?.(query).matches ?? fallback,
        () => fallback,
    );
}
