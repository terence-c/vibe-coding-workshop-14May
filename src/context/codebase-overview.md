# Codebase Overview — Studio Todo

> **Purpose of this file:** Drop-in context for any future Claude Code session so the model does not need to re-explore the repo. Read this first. Everything below has been verified against the actual source files (not guessed). If reality diverges from this document, trust the code and update this file.

---

## 1. TL;DR

**Studio Todo** is a single-page **Vue 3 + Vite** todo application styled after a "d.school-inspired" editorial layout (cream/teal/yellow palette, hard drop shadows, Epilogue + Work Sans + JetBrains Mono fonts). It runs entirely in the browser — there is **no backend, no API, no auth, no router, no global state library, and no test suite**. Tasks are persisted to `window.localStorage` under the key `dschool-todo-app`. The site is built with Vite and deployed to **Cloudflare** (Pages/Workers static-asset hosting) via Wrangler.

The entire UI is implemented in a single ~1080-line `<script setup lang="ts">` SFC ([src/App.vue](../App.vue)). All persistence helpers live in a separate plain-JS module ([src/tasks.js](../tasks.js)). Styling is hand-rolled CSS (~1500 lines) in [src/style.css](../style.css).

---

## 2. Project metadata

| Field | Value | Source |
|---|---|---|
| `package.json` name | `tryout-before-lunch` | [package.json](../../package.json) |
| Wrangler/Worker name | `vibe-coding-workshop-14may` | [wrangler.jsonc](../../wrangler.jsonc) |
| Display name (UI) | **Studio Todo** | [src/App.vue](../App.vue) brand-name |
| HTML `<title>` | `Studio Todo` | [index.html](../../index.html) |
| Version | `0.0.0` (private) | package.json |
| Module type | ES modules (`"type": "module"`) | package.json |
| Git default branch | `main` | repo state |
| Git user (last seen) | `terence-c` | repo state |

The repo lives at: `~/Desktop/SMU/01. Vibe Coding for Business Professionals/tryout-before-lunch`. The path contains spaces and a leading number — quote it when invoking shell commands.

---

## 3. Tech stack (exact versions from package.json)

**Runtime / framework**
- `vue` ^3.5.34 — Composition API with `<script setup>`, single SFC

**Build / tooling**
- `vite` ^8.0.12
- `@vitejs/plugin-vue` ^6.0.6
- `@cloudflare/vite-plugin` ^1.36.4 — enables Cloudflare Worker dev/preview/deploy through Vite
- `vue-tsc` ^3.2.8 — Vue-aware TypeScript checker, run during `build`
- `typescript` ~6.0.2
- `@vue/tsconfig` ^0.9.1 — base TS config for Vue DOM apps
- `@types/node` ^24.12.3
- `wrangler` ^4.90.1 — Cloudflare CLI for preview/deploy

**External resources loaded at runtime (not npm)**
- Google Fonts: `Epilogue` (weights 400/600/700/800), `JetBrains Mono` (500), `Work Sans` (400/500/600), `Material Symbols Outlined` — loaded via `<link>` in [index.html](../../index.html).
- Disqus comments — `embed.js` from `https://test-zy3jl34rlf.disqus.com/embed.js`, injected on mount.

There are **no other runtime dependencies**. No axios, no router, no Pinia, no UI library, no icon package (Material Symbols come from the Google Fonts link).

---

## 4. Scripts (package.json)

```jsonc
"dev":     "vite",                          // local dev server (HMR)
"build":   "vue-tsc -b && vite build",      // typecheck then build to dist/
"preview": "npm run build && wrangler dev", // build + run Wrangler local preview
"deploy":  "npm run build && wrangler deploy"
```

There is **no test script, no lint script, no format script**. Type checking happens only during `build` via `vue-tsc -b`.

---

## 5. Deployment

- **Target:** Cloudflare (static-asset SPA served by a Worker). Config in [wrangler.jsonc](../../wrangler.jsonc).
- **Worker name:** `vibe-coding-workshop-14may`
- **Compatibility date:** `2026-05-14`
- **Compatibility flags:** `nodejs_compat`
- **SPA routing:** `assets.not_found_handling = "single-page-application"` — any 404 falls back to `index.html`.
- **Observability:** enabled.
- The `.wrangler/` directory at the repo root is local Wrangler state (cache, deploy config). It is **not** source — do not edit it.

---

## 6. Repository layout (verified)

```
tryout-before-lunch/
├── .claude/
│   └── settings.local.json        # Permissions: allows `git stash *` and `git reset *`
├── .vscode/
│   └── extensions.json
├── .wrangler/                     # Local Wrangler state — generated, do not edit
├── dist/                          # Build output — generated, do not edit
├── node_modules/                  # Installed deps — generated
├── public/
│   └── favicon.svg                # Site favicon — browsers auto-request /favicon.svg; not referenced from index.html
├── src/
│   ├── context/                   # ← You are here. Context docs for future Claude sessions.
│   ├── CustomCursor.vue           # Pointer overlay: red laser trail (canvas) + red ring (DOM) on hover-clickables (Pass 05, merging Pass 03 + Pass 04 minus the dot)
│   │   ├── codebase-overview.md   # ← This file.
│   │   └── changes-NN.md          # One per "pass" / editing session, monotonically numbered.
│   ├── App.vue                    # The entire UI + state (~1082 lines, TypeScript)
│   ├── main.ts                    # 5-line Vue bootstrap
│   ├── style.css                  # Global stylesheet (~1509 lines, hand-rolled CSS)
│   └── tasks.js                   # localStorage CRUD + seed data (plain JS, no types)
├── .gitignore
├── README.md                      # Tiny user-facing readme (Features + npm commands)
├── index.html                     # Vite entry — loads /src/main.ts and Google fonts
├── package.json
├── package-lock.json
├── tsconfig.json                  # Root TS config (project references)
├── tsconfig.app.json              # App-scope TS config (includes src/**/*.{ts,tsx,vue})
├── tsconfig.node.json             # Tooling-scope TS config (vite.config.ts, etc.)
├── vite.config.ts                 # Plugins: vue() + cloudflare()
└── wrangler.jsonc                 # Cloudflare Worker config
```

**Files that matter for almost any change:** `src/App.vue`, `src/tasks.js`, `src/style.css`. Everything else is bootstrap or config.

---

## 7. Entry point & boot sequence

1. Browser loads [index.html](../../index.html).
2. `<head>` preconnects to Google Fonts and pulls in Epilogue / Work Sans / JetBrains Mono / Material Symbols stylesheets.
3. `<body>` contains a single `<div id="app"></div>` and `<script type="module" src="/src/main.ts"></script>`.
4. [src/main.ts](../main.ts) imports `./style.css` (side effect), imports `App` from `./App.vue`, calls `createApp(App).mount('#app')`. That's it — 5 lines.
5. `App.vue`'s `onMounted` registers a global `keydown` listener and injects the Disqus `embed.js` script tag.

---

## 8. The persistence layer — `src/tasks.js`

Plain JavaScript module (not TypeScript). All functions read/write `window.localStorage` under `STORAGE_KEY = 'dschool-todo-app'`. Each export is **synchronous** and returns either the resulting task(s) or a boolean.

**Seed tasks** (4 items) ship inside the module. They are returned by `read()` whenever localStorage is empty or unparseable, and `resetTasks()` rewrites localStorage with a fresh copy. The seeds reference dates `2026-05-14` through `2026-05-17` and categories `Build`, `Study`, `Admin`, `Personal`.

**Internal helpers (not exported)**
- `read()` → `Task[]` — returns parsed localStorage contents, or a copy of seeds if missing/invalid. Falls back to seeds in non-browser contexts (`typeof window === 'undefined'`).
- `write(tasks)` — JSON-stringify and persist. No-op outside a browser.
- `nextId(tasks)` → number — `max(id) + 1`, starting at 1 if the list is empty.

**Exported API** (all consumed by App.vue)

| Function | Signature | Returns | Behavior |
|---|---|---|---|
| `getTasks()` | `() → Task[]` | All tasks | Fresh read on every call |
| `getTask(id)` | `(id) → Task \| null` | Single task by id | |
| `createTask(input)` | `({title, details?, category?, priority?, due?}) → Task` | The new task | Prepends to list. Defaults: `details = 'No extra notes added yet.'`, `category = 'Tool'`, `priority = 'Medium'`, `due = today (en-CA YYYY-MM-DD)`, `done = false`, `createdAt = Date.now()` |
| `updateTask(id, patch)` | `(id, partial) → Task \| null` | Updated task or null | Preserves `id`; spreads patch over existing task |
| `toggleTask(id)` | `(id) → Task \| null` | Updated task | Flips `done` via `updateTask` |
| `deleteTask(id)` | `(id) → boolean` | `true` if removed | |
| `clearCompleted()` | `() → number` | Count removed | Filters out all `done: true` |
| `replaceAll(tasks)` | `(Task[]) → Task[]` | Stored tasks | Used by "Start fresh" (passes `[]`) |
| `resetTasks()` | `() → Task[]` | Stored tasks | Restores the 4 seed tasks |

**Data contract / Task shape** (defined by the seed objects and the TS interface in App.vue):

```ts
interface Task {
  id: number
  title: string
  details: string
  category: 'Tool' | 'Study' | 'Build' | 'Personal' | 'Admin'
  priority: 'High' | 'Medium' | 'Low'
  due: string            // ISO date 'YYYY-MM-DD' (en-CA locale)
  done: boolean
  createdAt: number      // Date.now() ms epoch
}
```

⚠ **Gotcha:** `tasks.js` is plain JS — the `Task` type is defined only in `App.vue` and the cast `getTasks() as Task[]` is applied at the call site. The persistence layer does not validate shape.

---

## 9. The UI + state layer — `src/App.vue`

Single SFC, `<script setup lang="ts">`. ~1082 lines. Structure:

### 9.1 Imports
From Vue: `computed`, `ref`, `onMounted`, `onUnmounted`, `nextTick`, `watch`. From `./tasks.js`: all eight CRUD exports (aliased with `…InDb` suffixes for clarity).

### 9.2 Local TypeScript types
- `Filter = 'all' | 'open' | 'done'`
- `Priority = 'High' | 'Medium' | 'Low'`
- `Category = 'Tool' | 'Study' | 'Build' | 'Personal' | 'Admin'`
- `SortKey = 'smart' | 'due' | 'priority' | 'created' | 'title'`
- `interface Task { ... }` (see §8)
- `interface Toast { id: number; message: string; tone: 'success' | 'info' | 'danger' }`

### 9.3 Module-level constants
- `categoryOptions`, `priorityOptions`, `filterOptions`, `sortOptions` — option arrays driving chips/segmented controls/dropdowns.
- `categoryIcons: Record<Category, string>` — Material Symbols glyph names: `Tool→build`, `Study→menu_book`, `Build→construction`, `Personal→self_care`, `Admin→inventory_2`.
- `priorityWeight: Record<Priority, number>` — `{High:0, Medium:1, Low:2}`, used by sorters.
- `todayInput` — today as `YYYY-MM-DD` via `toLocaleDateString('en-CA')`.
- `dateFormatter`, `longDateFormatter` — `Intl.DateTimeFormat('en-SG', …)`. Locale is **en-SG** (Singapore), short and long forms.

### 9.4 Reactive state
- `tasks` — `ref<Task[]>`, initialised from `getTasks()`.
- `activeFilter` (default `'all'`), `sortKey` (`'smart'`), `categoryFilter` (`'all'`), `priorityFilter` (`'all'`), `searchTerm` (`''`).
- `searchInputRef` — template ref for the search `<input>`.
- **Composer modal:** `composerOpen`, `newTitle`, `newDetails`, `newCategory` (default `'Personal'`), `newPriority` (`'Medium'`), `newDue` (today), `composerFirstFieldRef`.
- **Edit modal:** `editingTask`, `editTitle`, `editDetails`, `editCategory`, `editPriority`, `editDue`, `editFirstFieldRef`.
- **Delete confirmation:** `taskToDelete: number | null`.
- **Help modal:** `helpOpen`.
- **Toasts:** `toasts: Toast[]`, `toastIdCounter`, `pushToast(message, tone='success')` — auto-dismiss after **2800 ms**.
- **Focus restore:** `previouslyFocused: HTMLElement | null` — captured before opening any modal so focus can be returned on close.

### 9.5 Date helpers
- `isOverdue(due)` — string-compare `due < todayInput` (works because both are `YYYY-MM-DD`).
- `daysUntil(due)` — integer days, using `T12:00:00` to dodge DST/midnight edge cases. Returns `Number.POSITIVE_INFINITY` for empty string.
- `relativeDue(due)` — human label: `"5 days ago"`, `"Yesterday"`, `"Today"`, `"Tomorrow"`, `"In N days"`, or absolute short date past a week.
- `dueTone(task)` — returns CSS class `tone-overdue | tone-today | tone-soon | ''` based on `daysUntil`. Empty for `done` tasks.

### 9.6 Computed
- `visibleTasks` — applies status filter, category filter, priority filter, and case-insensitive search across `title + details + category + priority`. Then sorts using a `Record<SortKey, comparator>` map. **All sorters push `done` tasks to the bottom** by leading with `Number(a.done) - Number(b.done)`.
- Counts: `totalCount`, `openCount`, `doneCount`, `highPriorityCount` (open + High), `overdueCount` (open + past-due), `todayCount` (open + due today).
- `completionRate` — `round(doneCount / totalCount * 100)`, returns 0 for an empty board.
- `filterLabel` — the human label for the current `activeFilter`.
- `spotlightTask` — first open overdue task, else first open High-priority, else first open task, else null. Drives the "Next up" panel.
- `currentDateLabel` — formatted today, for the topbar caption.
- `anyModalOpen` — boolean OR of `composerOpen`, `editingTask`, `taskToDelete`, `helpOpen`. Used to suppress shortcut handling and to lock body scroll.
- `hasActiveFilters` — true if anything diverges from defaults.

### 9.7 Mutation handlers
Pattern: every mutator calls `refresh()` (which is `tasks.value = getTasks() as Task[]`) to re-read from localStorage after the persistence call.

- `openComposer()` / `closeComposer()` — manage composer state + focus restore; reset all `new*` fields on close.
- `addTask()` — validates non-empty trimmed title; calls `createTask(...)`; toasts `"Task added to the board"`.
- `quickAdd(event)` — handles Enter on the quick-add input. Bypasses the composer entirely with sane defaults (`category='Personal'`, `priority='Medium'`, `due=today`). Toasts `"Quick task added — tap edit to add details"`.
- `toggleTask(id)` — flips done; toast tone `'info'` with text mirroring the new state.
- `openEditModal(task)` / `closeEditModal()` / `saveTaskEdit()` — manage edit modal.
- `promptDeleteTask(id)` / `confirmDelete()` / `cancelDelete()` — two-step destructive flow with a confirmation modal.
- `focusSearch()` — focuses + selects the search input.
- `clearCompleted()` — wraps `clearCompletedInDb`; toast tells you how many were removed (pluralised).
- `resetBoard()` — `resetTasksInDb()`; toast `"Board reset to sample tasks"`.
- `startFresh()` — `replaceAllInDb([])`; toast `"Board cleared — start fresh"`.
- Filter shortcuts: `setCategoryFilter`, `setPriorityFilter` (toggle on/off), `jumpToOverdue` (open + sort by due + clear search/category/priority), `jumpToHighPriority`, `jumpToOpen`, `jumpToDone`, `jumpToToday`, `clearAllFilters`.
- `categoryIcon(category)` / `cardTone(category)` — view helpers; `cardTone` returns `"card--<lowercase-category>"`.
- `focusFirstTask()` — focuses the first task card's checkbox (used by the `J` shortcut).

### 9.8 Global keyboard handler — `handleKeydown(event)`
Behaves differently based on whether focus is in an input/textarea/select and whether any modal is open.

**Escape priority (any focus):** help → delete confirmation → edit → composer → clear search if focused.

**When NOT typing and NO modal is open:**
- `/` — focus the search field.
- `N` (case-insensitive) — open the composer.
- `?` — open the keyboard shortcuts modal.
- `J` (case-insensitive) — focus the first task's checkbox.

### 9.9 Lifecycle & side effects
- `onMounted`: register the keydown listener; call `loadDisqus()`.
- `onUnmounted`: remove the keydown listener.
- `watch(anyModalOpen, open → document.body.style.overflow = open ? 'hidden' : '')` — lock body scroll while any modal is open.
- `loadDisqus()` — appends a `<script src="https://test-zy3jl34rlf.disqus.com/embed.js" data-timestamp="…">` to `<head>` (or `<body>` as fallback). ⚠ **Hardcoded Disqus shortname `test-zy3jl34rlf`** — if you fork or rename the site, change it here.

### 9.10 Template (top-to-bottom)
Wrapper: `.app-shell` containing a `.grid-overlay` decorative div and a `.skip-link` for keyboard users.

1. **`<nav class="topbar">`** — brand block (the `d.` mark + "Studio Todo" + today's long date), plus right-side actions: Shortcuts button, search-focus icon button, "New task" CTA.
2. **`<header class="masthead">`** — `Your tasks` eyebrow + the current filter label as `<h1>`.
3. **`<main class="main-board">`** containing:
   - **`.stat-row`** — clickable filter chips: Total / Open / Done / Today / High / Overdue, plus a non-clickable progress card showing `completionRate %` with a `.progress-bar` fill. Some buttons are `disabled` when their count is 0.
   - **`.spotlight.panel`** (v-if `spotlightTask`) — "Next up" hero with edit + mark-done actions.
   - **`.toolbar.panel`** — quick-add input, search field, segmented filter control, sort dropdown, and chip rows for Category & Priority. Includes a "Clear filters" chip (only if `hasActiveFilters`) and a "Clear done" chip (disabled if `doneCount === 0`).
   - **`#tasks-region.tasks-panel.panel`** — heading shows `N task(s)` + a `Filtered` badge if filters are active. Body is a `<transition-group name="card">` rendering each task as an `<article class="task-card">`. Each card has a checkbox, category label + priority pill, title, details, edit/delete icon buttons, and a footer with a due-date pill (showing `Overdue` badge when applicable). Empty state has three variants (filtered / never had tasks / no matches in current view) with appropriate CTAs.
   - **`.comments-panel.panel`** — Disqus container `<div id="disqus_thread">` + a `<noscript>` fallback.
4. **`<footer class="site-footer">`** — brand block + "Reset to samples" and "Start fresh" actions.
5. **Floating action button** `.fab` — visible only on mobile (controlled via CSS), opens the composer.
6. **Four modals** (top-level siblings, conditionally rendered): Composer, Edit, Delete confirmation, Keyboard shortcuts. Every modal uses an `.modal-overlay` (closes on click) wrapping a `.modal` (with `@click.stop`), `role="dialog"`, `aria-modal="true"`, and a labelling `aria-labelledby`. Forms use `@submit.prevent` to call the appropriate handler.
7. **Toast stack** — `.toast-stack` with `aria-live="polite"`, `aria-atomic="true"`, rendering toasts inside a `<transition-group name="toast">`. Toast icon swaps by tone: `danger→delete`, `info→info`, `success→check_circle`.

---

## 10. Styling — `src/style.css`

Hand-rolled CSS, no framework. ~1509 lines. Conventions:

### 10.1 CSS variables (`:root`)
Palette: `--bg #fff8df`, `--surface`, `--surface-strong #f9f9f4`, `--ink #191d11`, `--ink-soft`, `--ink-muted`, `--teal #82d3de`, `--yellow #ffc857`, `--pink #ffdad5`, `--green #b6d96f`, `--line`, `--line-strong`, `--shadow 4px 4px 0 rgba(25,29,17,1)`, `--shadow-soft`, `--danger #e5392d`, `--danger-dark #c41a0f`, `--warn #ffb020`.
Typography: `--font-display 'Epilogue'`, `--font-body 'Work Sans'`, `--font-mono 'JetBrains Mono'`.

### 10.2 Class naming (BEM-ish)
- Block elements: `.task-card`, `.stat-card`, `.chip`, `.panel`, `.modal`, `.toast`, `.spotlight`, `.toolbar`, `.fab`, etc.
- Modifiers via `--`: `.chip--category`, `.chip--prio-high`, `.task-card--build`, `.stat-card--clickable`, `.stat-card--accent`, `.submit-button--danger`, `.modal--small`, etc.
- State classes: `.is-active`, `.is-pressed`, `.is-done`, `.is-overdue`.
- Tone helpers used by date pills: `.tone-overdue`, `.tone-today`, `.tone-soon`.

### 10.3 Background
`body` has a layered background: two radial gradients (teal top-left, yellow right) over a vertical cream gradient.

### 10.4 Accessibility utilities
`.visually-hidden`, `.skip-link`. ARIA roles/attributes are wired in the template (`role="dialog"`, `aria-modal`, `aria-live`, `aria-selected` on tabs, labelled buttons throughout).

---

## 11. Configuration files (annotated)

### [vite.config.ts](../../vite.config.ts)
```ts
plugins: [vue(), cloudflare()]
```
No path aliases, no env handling, no custom build settings.

### [tsconfig.json](../../tsconfig.json)
Project-references file; delegates to `tsconfig.app.json` and `tsconfig.node.json`.

### [tsconfig.app.json](../../tsconfig.app.json)
- Extends `@vue/tsconfig/tsconfig.dom.json`.
- `allowJs: true` — required because `tasks.js` is plain JS.
- `noUnusedLocals: true`, `noUnusedParameters: true` — strict.
- `erasableSyntaxOnly: true` — disallows non-erasable TS syntax (e.g. enums, parameter properties).
- `noFallthroughCasesInSwitch: true`.
- `types: ["vite/client"]`.
- `include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]` — note: **does not include `.js`**, but `allowJs` covers `tasks.js` when it's imported.

### [tsconfig.node.json](../../tsconfig.node.json)
Tooling-scope (e.g. vite.config.ts).

### [wrangler.jsonc](../../wrangler.jsonc)
See §5.

### [.claude/settings.local.json](../../.claude/settings.local.json)
Pre-approves `Bash(git stash *)` and `Bash(git reset *)` for the Claude Code permission system. No other automation/hooks are configured.

### [.vscode/extensions.json](../../.vscode/extensions.json)
Editor recommendations only.

### [.gitignore](../../.gitignore)
Standard ignores for `node_modules/`, `dist/`, `.wrangler/`, etc.

---

## 12. Keyboard shortcuts (verbatim from the Help modal)

| Key | Action |
|---|---|
| `N` | New task (open composer) |
| `/` | Focus search |
| `J` | Jump to first task |
| `?` | Show shortcuts help |
| `Esc` | Close any open modal; in search, clears the query and blurs |
| `Enter` | In the quick-add bar, create the task |

Shortcuts are suppressed while focus is inside an `<input>`, `<textarea>`, or `<select>`, or while any modal is open (the Escape handler still runs).

---

## 13. Recent commit history (snapshot)

Most recent commits at the time this doc was written:
```
249973b Restore Disqus comments section
956f871 Implement comprehensive UI/UX improvements
d8c6704 Add critical UI/UX improvements to todo app
7bbc86d Added disqus
85f3127 Edit cloudflare
eddff4a Merge origin/main (Cloudflare Workers config) into local work
1a753a0 Edited the Clear Done button
b04bd44 Fixed navbar
fd1cc2e Merge pull request #1 from terence-c/cloudflare/workers-autoconfig
0663449 Add Cloudflare Workers configuration
```

The two big commits (`956f871` and `d8c6704`) added ~2000 lines to `App.vue` + `style.css` — that's where the modals, keyboard shortcuts, toasts, stat row, spotlight, and most of the current UI came from. Treat them as the "modern era" of this codebase.

⚠ Always run `git log --oneline -20` if you need authoritative history — the list above is frozen at the time of writing.

---

## 14. Known gotchas and dead code

These are not opinions — they are verifiable facts. Future Claude should know them before making changes.

1. **`tasks.js` is plain JavaScript, not TypeScript.** The `Task` interface only exists in `App.vue`. If you migrate `tasks.js` → `tasks.ts`, also remove `allowJs` from `tsconfig.app.json` and update the import in `App.vue` (path stays `./tasks.js` only because of the bundler's module resolution; with TS you'd want `./tasks` or `.ts`).
2. **Disqus shortname is hardcoded** in `loadDisqus()` (`test-zy3jl34rlf`). It is also wrong-looking enough that it's clearly a test shortname. If you fork or deploy under a new identity, replace it.
3. **`@vue/tsconfig` ^0.9.1 + `typescript` ~6.0.2 + `vite` ^8** is an unusually new (early-2026) toolchain combo. If installs fail or types misbehave, suspect tooling drift before chasing app-level bugs.
4. **No tests.** There is no Vitest/Jest/Playwright setup. Manual verification is the only safety net — for UI changes, run `npm run dev` and click through the golden path (add → edit → toggle → delete → clear completed → reset → start fresh) plus filter combinations and keyboard shortcuts.
5. **Locale mixing.** `Intl.DateTimeFormat` uses `'en-SG'` (Singapore), `toLocaleDateString('en-CA')` is used to produce ISO `YYYY-MM-DD` strings (because en-CA happens to format that way). Don't "fix" the en-CA call — it's deliberate.
6. **`spotlightTask` can be `null`** when all tasks are done or the board is empty — the template guards it with `v-if`.
7. **Quick-add and full composer have different defaults.** Quick-add defaults to `category='Personal'`, full composer's initial state is also `'Personal'`; but `createTask`'s own fallback is `category='Tool'` if nothing is passed. The composer always passes a value, so the `'Tool'` default in `tasks.js` is essentially unreachable from the current UI — it would only matter if `createTask` were called from elsewhere.
8. **Body-scroll lock is global.** `document.body.style.overflow` is written directly. If you add another component that also locks scroll, coordinate or it will fight.
9. **Permissions file pre-allows `git reset *` and `git stash *`** — this is for convenience in this project, but be aware destructive git operations may not prompt.
10. **No `<link rel="icon">` in `index.html`.** `public/favicon.svg` exists and browsers will auto-request it, but if you ever want explicit control (e.g. `apple-touch-icon`, sizes, `manifest.json`), there's no scaffolding for it yet.

> **History:**
> - Pass 02 removed previously-dead files (`src/components/HelloWorld.vue`, `src/assets/{hero.png,vite.svg,vue.svg}`, `public/icons.svg`) and their now-empty parent directories. See `changes-02.md`.
> - Pass 03 added `src/LaserCursor.vue` — a canvas-based laser-trail pointer overlay riding on the `--danger`/`--pink` palette of the masthead "Everything" headline. See `changes-03.md`.
> - Pass 04 pivoted the cursor effect: deleted `src/LaserCursor.vue`, added `src/CustomCursor.vue` — a click-affordance custom cursor (red dot → red ring when over interactives). Same `--danger` palette. See `changes-04.md`.
> - Pass 05 merged the two: `CustomCursor.vue` now combines the Pass 03 laser trail with Pass 04's ring (shrunk 42 → 34 px, ~20 % smaller), dropped the persistent dot. Also added `.icon-button--accent:hover` (yellow) in `style.css` and applied it to the per-task Edit button so it mirrors the Delete button's hover treatment. See `changes-05.md`.

---

## 15. What this codebase deliberately does NOT have

If a feature request implies any of these, it's net-new work — call it out:

- ❌ No backend, no API client, no server-side persistence.
- ❌ No authentication / user accounts.
- ❌ No router (`vue-router`) — single screen.
- ❌ No global store (`pinia`, `vuex`) — all state is in `App.vue`.
- ❌ No tests / test runner / CI checks for tests.
- ❌ No linter (`eslint`) or formatter (`prettier`).
- ❌ No i18n.
- ❌ No theming / dark mode — single light palette.
- ❌ No mobile-specific layout beyond responsive CSS + a mobile FAB.
- ❌ No drag-and-drop reordering.
- ❌ No undo/redo.
- ❌ No multi-list / project grouping.
- ❌ No keyboard navigation inside the task grid beyond `J` jumping to the first card.
- ❌ No service worker / offline shell beyond the SPA fallback in Wrangler.

---

## 16. Working in this repo — quick checklist for future Claude

When the user asks for a change:

1. **Decide which of the three real files it touches:** state/logic → `App.vue`; persistence/data shape → `tasks.js`; visuals only → `style.css`. Most asks touch two of the three.
2. **Mind the type interface in `App.vue`** — if you add a field to `Task`, update both the interface there and the seed data + `createTask` defaults in `tasks.js`.
3. **Verify in the browser** for any UI/visual change. There are no tests; `vue-tsc -b` catches type errors but not behaviour.
4. **Don't add a dependency** unless the user explicitly accepts that cost — this project deliberately ships with only Vue.
5. **Update this overview** when something here goes stale, and **always add a `changes-NN.md` entry** (see §17) so the next session knows what moved.

---

## 17. The `changes-NN.md` log

Every editing session ("pass") that mutates the repo should drop a new file `src/context/changes-NN.md`, where `NN` is the next zero-padded sequence number. Use the template inside `changes-01.md` as the starting point. Read the latest `changes-NN.md` along with this file at the start of each session to pick up where the last one left off.

The first entry — `changes-01.md` — documents the creation of this folder and this file.

---

*Last verified against source: 2026-05-14 (see latest `changes-NN.md`).*
