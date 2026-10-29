# Code Cafe client

React 19 + Vite + Tailwind 4 + TypeScript.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 (the port the backend's CORS allows) |
| `npm run build` | Type-check (`tsc`) and build to `dist/` |
| `npm run preview` | Serve the production build on http://localhost:3000 |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest (`npm test -- --run` for a single run) |

The API base URL comes from `VITE_API_URL` (default `http://localhost:8000`).
