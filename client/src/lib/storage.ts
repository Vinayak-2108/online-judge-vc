/**
 * The only place that touches localStorage. Every call survives blocked or full storage; values
 * written while storage is unavailable stay in memory for this page view.
 */
const memory = new Map<string, string>();

export const storage = {
    get(key: string): string | null {
        try {
            const value = localStorage.getItem(key);
            if (value !== null) return value;
        } catch {
            // fall back to memory
        }
        return memory.get(key) ?? null;
    },
    set(key: string, value: string): boolean {
        try {
            localStorage.setItem(key, value);
            memory.delete(key);
            return true;
        } catch {
            memory.set(key, value);
            return false;
        }
    },
    remove(key: string): void {
        memory.delete(key);
        try {
            localStorage.removeItem(key);
        } catch {
            // nothing to remove
        }
    },
};

export const getToken = () => storage.get("token");
