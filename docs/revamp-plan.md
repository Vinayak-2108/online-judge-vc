# Code Cafe — dependency upgrade and UI revamp plan

Status: **plan only, nothing implemented.** Builds on the security fixes awaiting review (not yet committed).
Design decisions were made with the `design-taste-frontend` skill (tasteskill v2); the dealt sheets are saved in
`.taste-skill/page/direction.json` and `.taste-skill/app/direction.json` at the repo root above this folder.
Mockup: Figma file "Code Cafe — UI revamp", https://www.figma.com/design/hvLy5mjUTKKi4dueHbynHd
- Done (light + dark): tokens and components, Problems, Workspace, Submissions, Sign in / Create account (error state).
- Landing page (light + dark, working theme toggle and live editor) and phone screens are an HTML mockup instead of Figma
  (the Starter plan's Figma call limit was reached): https://claude.ai/artifact/BUeAu6jwq5miYVmwGxNaBh
  Source copy: `docs/mockup/` (Design-canvas `.dc.html` files).
- Pictures for the landing page are downloaded with credits in `client/public/images/` (`credits.json`).

---

## 1. Dependency upgrades

### Frontend (`client/`)

| Today | Target (latest, 29 Oct 2026) | Why / notes |
|---|---|---|
| react-scripts 5.0.1 (CRA, unmaintained) | **vite 8.3** + **@vitejs/plugin-react 6.1** | CRA is dead; its babel preset already warns it may break. `REACT_APP_*` env → `VITE_*`. |
| react / react-dom 18.2 | **19.3** | Watermelon components target React 19. No class components or legacy APIs in this app, so the bump is low risk. |
| react-router-dom 6.14 | **react-router 8.5** (package renamed in v7) | Data routers: `createBrowserRouter` + loaders for problem/submission fetches. |
| plain JS | **TypeScript 7.0** (`.tsx`) | Watermelon ships `.tsx`; migrate file by file (`allowJs` during the switch). If TS 7's native compiler breaks a tool, pin 6.x. |
| tailwindcss 3.3 + tailwind.config.js | **tailwindcss 4.3** + **@tailwindcss/vite** | CSS-first config (`@theme`), required by shadcn/Watermelon. Delete `tailwind.config.js`. |
| — | **shadcn 4.23** CLI, **@base-ui/react 1.9**, clsx, tailwind-merge, class-variance-authority, tw-animate-css | Watermelon installs via `npx shadcn add https://registry.watermelon.sh/r/<slug>.json`; its primitives live in `@/components/base-ui/*`. |
| framer-motion 10.13 | **motion 14.7** (`motion/react`) | Renamed package; only press/hover feedback and the hero ticket print use it. |
| @uiw/react-codemirror 4.21, @codemirror/lang-* 6.0 | **4.25.12**, lang-cpp 6.0.3, lang-python 6.2.1, lang-java 6.0.2 | Add a light and a dark editor theme built from the tokens (no bundled "monokai"). |
| — | **lucide-react 1.64** (one icon set) | Watermelon pulls lucide, react-icons and tabler; standardise on lucide and swap the others when a component is installed. |
| — | **sonner 2.0** | Toasts for run/submit errors and "Logged out". |
| Google Fonts @import in CSS | **@fontsource-variable/archivo 5.3**, **@fontsource/ibm-plex-mono 5.3** | Self-hosted fonts, no layout shift, no third-party request. |
| @testing-library/* 13, jest via CRA | **vitest 5.0** + **@testing-library/react 16.3** | Smoke tests for routing, theme toggle and the run/submit flow with a mocked API. |
| eslint via CRA | **eslint 10** flat config + typescript-eslint + react-hooks | Fixes today's unused-vars / a11y warnings as part of the move. |
| save, web-vitals | **remove** | Unused. |

### Backend (`codecafe/`)

| Package | Pinned now | Plan |
|---|---|---|
| Django | 5.2.18 (LTS, supported to Apr 2028) | **Stay on 5.2 LTS.** Django 6.1.2 is out, but nothing here needs it; revisit at 6.2 LTS. |
| djangorestframework | 3.18.3 | Already latest. |
| Others | as in `requirements.txt` | Already latest; add `pip-audit` to CI. |

Small backend additions the new screens need (no new apps):

- `Submissions`: add `code` (text), `runtime_ms` (int, max over test cases), `passed` / `total` (ints), and a FK to `User` instead of a username string; migration copies the username across.
- `QuestionList`: add `slug`, `input_format`, `output_format`, `constraints`, and `examples` (JSON) so the problem page can render sample cases; `difficulty` becomes a choices field (`light`/`medium`/`dark` roast ↔ Easy/Medium/Hard).
- `GET /api/questions/` returns the caller's status per problem (`solved`, `attempted`, `new`) and the problem's acceptance rate.
- `GET /api/me/` returns counts by roast for the overview strip.
- `compiler.judge` returns `(verdict, passed, total, runtime_ms)`; Judge0 already reports `time` per run.

---

## 2. Design direction (from the taste skill)

### The idea
> On this page, **the café's menu and its printed tickets** become **the page itself**: problems are menu items ranked by roast, and every submission prints a ticket with its verdict.

Difficulty is roast: Easy = Light roast, Medium = Medium roast, Hard = Dark roast. Each submission is shown as a café-style ticket, numbered (`Submission #1043`). In all UI copy they are called **submissions**, never orders.

### Two runs, one palette and one face

| | Landing page (`/`) | App screens (problems, workspace, submissions, sign in) |
|---|---|---|
| Run | Page run | App-screen run (`references/app-screens.md`) |
| Dealt | Direction **page-is-the-object** (seed 665408074); hero redrawn once to **Striped card beside the room** (the dealt folder stack is an archive object, not a café one) | Style **framed-sheet** (seed 1823600547): one tinted L-frame, the work on a white sheet inset 8px, 16px corners, no shadow |
| Live thing / signature | The hero's right half is a real editor: edit "Sum of Two Numbers", press Run, a ticket prints with the verdict | The **roast mark**: a small filled swatch in the roast's brown beside every difficulty (replaces the dealt retail "sell-out strip") |

### Tokens

Brand colours are kept (`--keep palette,type`) and mapped onto the dealt roles. One accent, used on the primary action, the active tab underline and the main data mark only.

| Role | Light ("the printed menu") | Dark ("the chalkboard") |
|---|---|---|
| frame (sidebar + top bar) | `#f7f5f2` (coffee-tinted step) | `#0d0d0d` |
| sheet / page | `#ffffff` | `#141414` |
| raised | `#f4f2ee` | `#1e1e1e` |
| border (sheet edge, cards) | `#ebe8e3` | `#262626` |
| rule (table rows) | `#f2f0ec` | `#1c1c1c` |
| control border | `#d4d0c9` | `#3d3d3d` |
| text | `#1a1612` (espresso ink) | `#f5f3ef` (chalk) |
| muted | `#615a52` (6.8:1 on white) | `#b4b0aa` (8.5:1) |
| accent (brand orange) | `#c45200` for text/marks (4.6:1); `#f86f03` fill with ink label (6.2:1) | `#ff8a2a` (7.8:1 on #141414) |
| primary button | espresso `#1a1612`, white label | chalk `#f5f3ef`, espresso label |
| roast swatches (data, always beside their word) | light `#b3845a` (3.3:1), medium `#8b5a2b` (5.8:1), dark `#3b2414` (14.5:1) | light `#d9b48f` (9.5:1), medium `#a8723f` (4.5:1), dark `#8a5a36` (3.2:1) |
| positive (Accepted) | `#247b50` on pill `#dcfae5` | `#3fc07a` on `#172a1d` |
| negative (Wrong answer, CE, RE) | `#c4242a` on pill `#ffedea` | `#e5566f` on `#2c1a20` |
| warning (TLE) | `#92400e` on pill `#fffbeb` | `#f0b45a` on `#2a2112` |

Type: **Archivo**, one family. Display at its narrowest width (wdth 62, weight 800, uppercase) on the landing page only; app screens use Archivo at normal width, 12/14/16/24 scale, weights 400/500/600. **IBM Plex Mono** has one job: code, ticket numbers and runtimes.
Radius: landing page square; app: sheet 16, cards 8, controls 6, pills 999.

### Theme toggle
- `data-theme="light|dark"` on `<html>`; default follows `prefers-color-scheme`; choice saved in `localStorage` (wrapped in try/catch).
- A 6-line inline script in `index.html` sets the attribute before first paint (no flash).
- Control: Watermelon **switch-16** (sun · switch · moon), restyled: neutral track, accent only on focus ring. Lives in the top bar on app screens and in the landing page's top row; on phones in the menu sheet.
- CodeMirror swaps between two themes generated from the same tokens.

### House rules that shape the components (checked by `lint.mjs` / `inspect.mjs`)
No gradients, glass, glows or resting shadows; no eyebrow labels or tracked uppercase headers; no zebra rows or header bands; no pagination under short lists; numbers right-aligned in tabular figures; colour only on data, status and the one primary action; no violet/indigo; no emoji.

---

## 3. Screens and the Watermelon components behind them

Each Watermelon component is installed with `npx shadcn@latest add https://registry.watermelon.sh/r/<slug>.json`, then restyled to the tokens above (strip `shadow-sm`, `bg-muted/20` header fills, `tracking-[0.08em]`, sky/green Tailwind colours).

| Screen | Its one question | Built from | Notes |
|---|---|---|---|
| **Landing** `/` | "What is this and can I try it?" | navigation shell (custom, plain bar), **switch-16**, **tabs-26** (language tabs on the hero editor), **sonner-10** | Sections per the sheet: hero card + live editor → how a run works (drag row) → the menu (cards that fold into spines) → output slips (real tickets) → reply card CTA → scalloped footer. |
| **Sign in / Sign up** `/signin` | "Get me to the counter" | **swap-form** (animated sign in ⇄ sign up; strip blur effect), **form-10** field pattern, **sonner** | Password rules shown beside the field (`aria-describedby`), server errors inline. |
| **Problems** `/problems` | "Which problem do I brew next?" | **data-table-10** (sorting) minus checkboxes and pagination, **tabs-26** (All · To brew · Solved), search input, **select-10** (roast filter), **badge** pills | Rows: status mark, name, roast mark, acceptance %, your best runtime. Finding line under the title ("2 of 3 brewed · Nth Fibonacci untouched"). |
| **Workspace** `/problems/:slug` | "Does my code pass?" | resizable split (custom, 2 panes), **tabs-26** (Description · Submissions), **select-10** (language), CodeMirror, **sonner**, **dialog** for the verdict ticket on phones | Left: statement, examples, constraints. Right: editor, custom input, output; Submit prints a submission ticket inline (verdict, passed/total, runtime). |
| **Submissions** `/submissions` | "How did my recent submissions do?" | **data-table-10** sortable, **tabs-26** (Mine · Everyone), **badge** pills | Submission #, problem, language, verdict pill, tests, runtime, time. Capped at 50 with "Load more". |
| **App shell** | — | **macos-sidebar** structure only (no spring width animation), **switch-16**, **dropdown-menu** (account), **sheet** (phone nav) | Frame on `--frame`, sheet inset 8px. Wordmark top-left; Problems, Submissions; account + theme at the foot. |

---

## 4. Order of work

1. **Tooling swap** (one PR): Vite 8 + TS + Tailwind 4 + ESLint 10 + Vitest; port `src/` files to `.tsx` unchanged; app must look and work exactly as today. Verify: `npm run build`, `vitest`, manual run/submit.
2. **Tokens and theme** (one PR): `@theme` tokens for both themes, no-flash script, switch-16, self-hosted fonts.
3. **shadcn + Watermelon install** (one PR): `components.json` (aliases `@/components`, `@/lib/utils`), add the components in §3, restyle base-ui primitives once.
4. **Backend fields** (one PR, with tests): §1 backend additions and migrations.
5. **Screens**, one PR each: shell → problems → workspace → submissions → sign in → landing.
6. **Gate each screen** with the skill: `node .claude/skills/design-taste-frontend/scripts/lint.mjs --app src` and `inspect.mjs --app` on `vite build && vite preview` at 1440/768/390 in both themes; fix every FAIL; critique the screenshots.

## 5. Verification

- `npm run build` clean, `npm run lint` clean, `vitest` green; `python manage.py test` green.
- E2E in the browser on both themes: sign up → problems → open problem → Run → Submit (Accepted / Wrong Answer / Compilation Error) → submissions → toggle theme (persists after reload, no flash) → sign out.
- Contrast: every text token ≥ 4.5:1 on its surface, marks ≥ 3:1 (values above were chosen to pass; re-check with the inspector).
- Phone (390px): sidebar folds to a top bar + sheet, tables become two-line rows, editor and problem become two tabs.
