import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

/** Preload the fonts the first screen needs, so text does not shift when they arrive. */
function preloadFonts(): Plugin {
    return {
        name: "preload-fonts",
        transformIndexHtml: {
            order: "post",
            handler(_html, ctx) {
                if (!ctx.bundle) return;
                return Object.keys(ctx.bundle)
                    .filter((f) => /archivo-latin-wdth-normal.*\.woff2$/.test(f) || /ibm-plex-mono-latin-(400|500)-normal.*\.woff2$/.test(f))
                    .map((f) => ({
                        tag: "link",
                        attrs: { rel: "preload", as: "font", type: "font/woff2", crossorigin: "", href: `/${f}` },
                        injectTo: "head" as const,
                    }));
            },
        },
    };
}

// Port 3000 is what the backend's CORS_ALLOWED_ORIGINS expects.
export default defineConfig({
    plugins: [react(), tailwindcss(), preloadFonts()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    server: { port: 3000, strictPort: true },
    preview: { port: 3000, strictPort: true },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        css: false,
    },
});
