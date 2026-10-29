import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Port 3000 is what the backend's CORS_ALLOWED_ORIGINS expects.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: { port: 3000, strictPort: true },
    preview: { port: 3000, strictPort: true },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        css: false,
    },
});
