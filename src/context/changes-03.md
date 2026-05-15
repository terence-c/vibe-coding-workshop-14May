# Changes — Pass 03

**Date:** 2026-05-15
**Branch:** `cursor-motion` (branched from `main` at commit `249973b Restore Disqus comments section`)
**Author of pass:** Claude Code (Opus 4.7) at the user's direction

---

## Summary

Added a laser-style cursor trail that follows the pointer across the viewport, palette-locked to the red colour of the masthead H1 ("Everything"). Implemented as a single new SFC `src/LaserCursor.vue`, mounted once at the top of `App.vue`'s template. `npm run build` passes; bundle grew by ~0.75 kB gz JS / 0.06 kB gz CSS.

The native OS cursor is **kept**. The laser is purely additive — it draws on top of the page with `pointer-events: none`, so clicks, focus, hover, and selection all behave normally.

---

## Files added

| Path | Lines | Purpose |
|---|---|---|
| `src/LaserCursor.vue` | 132 (TS + template + scoped CSS) | Canvas-based laser-trail overlay. |

## Files modified

| Path | Change |
|---|---|
| `src/App.vue` | Two edits only: (1) added `import LaserCursor from './LaserCursor.vue'` at the bottom of the existing import block; (2) added `<LaserCursor />` as the first child of `.app-shell` in the template. No other logic, layout, or style touched. |
| `src/context/codebase-overview.md` | §6 file tree: added `src/LaserCursor.vue` entry. §14 History block: added a Pass 03 bullet. **Not staged** (gitignored on the user's working tree, but the rule was reset between Pass 02 and Pass 03 — see "Branch / git context" below). |

## Files deleted / renamed

*(none)*

---

## Where "Everything" lives and how we sampled its colour

The word that appears on the landing page header (e.g. "Everything", "Open", "Done" depending on the active filter) is rendered by:

- `src/App.vue` line 548: `<h1>{{ filterLabel }}</h1>` inside `<header class="masthead">`. The default `filterLabel` is `"Everything"` because the initial `activeFilter` ref is `'all'` and `filterOptions[0].label === 'Everything'`.
- `src/style.css` line 216–223: `.masthead h1 { … color: var(--danger); }`.
- `src/style.css` line 16: `--danger: #e5392d;`.

So the **single canonical colour** of the word "Everything" is `#e5392d` (CSS custom property `--danger`).

To make it read as a *laser* rather than a flat line, the trail stacks four passes per frame and ends with a glowing head dot. Each pass uses a colour already present in the global palette:

| Layer | Hex | CSS var equivalent | Role |
|---|---|---|---|
| 1 — soft halo (widest, ~6–28 px) | `#ffdad5` (45% × age) | `--pink` | Outer glow, gives the laser its "bloom" |
| 2 — main beam (~2–10 px) | `#e5392d` (85% × age) | `--danger` | The colour of "Everything" itself — this is the visual anchor |
| 3 — deep red inner stroke (~1–4 px) | `#c41a0f` (90% × age) | `--danger-dark` | Saturates the core of the beam |
| 4 — hot near-white core (~0.5–2.5 px) | `#fff8df` (100% × age) | `--bg` (cream) | The hottest sliver inside the beam |
| Head dot | `#fffcf0` 95% on `--danger` `shadowBlur: 18` | — | Bright point at the cursor itself |

Every alpha is multiplied by `(1 − age)` where `age` linearly grows from 0 (just-drawn) to 1 (about to expire at `TRAIL_MS = 320` ms), so the trail fades smoothly from head to tail.

The two colours that were *added* to the palette (`#fffcf0` head fill and `#fff8df` core) are within 1–2 lightness steps of the existing `--bg` cream — they are deliberately not new brand colours, just slightly hotter cream tones to act as the laser's hot centre against the red.

---

## Implementation notes (`src/LaserCursor.vue`)

- **Rendering tech:** HTML5 `<canvas>` in 2D context, full viewport, scaled by `devicePixelRatio` so it stays crisp on retina displays. SVG was considered but rejected because per-segment alpha (the "fading tail" effect) is awkward in SVG without per-segment elements or gradients-along-path.
- **Event:** `pointermove` on `window`, `{ passive: true }`. Touch events filtered out (`if (e.pointerType === 'touch') return`).
- **Trail buffer:** an in-module mutable array `points: Point[]` (NOT a Vue ref — these mutate every frame and would thrash reactivity for no benefit). Each point is `{ x, y, t }` with `t = performance.now()`.
- **Animation:** single `requestAnimationFrame` loop, scheduled at mount, cancelled at unmount. Each frame: clear, prune expired points (`now - points[0].t > TRAIL_MS`), stroke four layers, draw head dot.
- **Per-frame work:** at 60 Hz with normal mouse-move rates, the array stays under ~30 points → four loops × ~30 segments = ~120 stroke calls per frame. Trivial on any modern device.
- **Performance:** `lineCap = 'round'`, `lineJoin = 'round'` set once per frame. `shadowBlur` is only applied to the single head-dot fill (not to the stroke loops — `shadowBlur` on strokes is expensive on some GPUs).
- **No blend mode.** Tried `mix-blend-mode: multiply` and `screen` mentally; both have failure modes on the cream `--bg` (multiply darkens the white core out, screen washes out on the cream). Plain alpha compositing was chosen.
- **Z-index 9999** so the trail sits over modals (`.modal-overlay`), toasts, the FAB, the topbar — everything. `pointer-events: none` so it never blocks input.
- **No native-cursor hiding.** The page does not set `cursor: none`. Users still get their OS cursor; the laser is decorative.

## Accessibility & graceful degradation

- **`prefers-reduced-motion: reduce`** — read synchronously in `<script setup>` (NOT inside `onMounted`). If `matches`, the entire component short-circuits: no listeners attached, no rAF loop, and the `<canvas>` is removed from the DOM via `v-if`. Users with reduced-motion preferences see zero added motion.
- **Touch / no-hover devices** — CSS `@media (hover: none)` hides the canvas. The `pointermove` handler also filters `pointerType === 'touch'` as a belt-and-braces measure (some browsers fire `pointermove` for touch even without `hover: none`).
- **`aria-hidden="true"`** on the canvas — screen readers ignore it. Nothing meaningful is announced.
- **No keyboard interaction affected.** Tab order, focus rings, all existing shortcuts (`N`, `/`, `J`, `?`, Esc) untouched.
- **No layout shift.** The canvas is `position: fixed`, occupies no flow space.

## How `App.vue` was modified

Two surgical edits — no other code re-ordering, formatting, or refactor:

```diff
 import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
 import {
   getTasks, …
 } from './tasks.js'
+import LaserCursor from './LaserCursor.vue'
```

```diff
 <template>
   <div class="app-shell">
+    <LaserCursor />
     <div class="grid-overlay" aria-hidden="true"></div>
     <a class="skip-link" href="#tasks-region">Skip to tasks</a>
```

Placed as the first child of `.app-shell` so it sits over the `.grid-overlay` and everything else. (It's `position: fixed` regardless — DOM order only matters when z-indexes tie, but keeping it first also makes it grep-able.)

---

## Verification

1. **Build:** `npm run build` → `vue-tsc -b && vite build` both pass.
   - Module count: 13 → 17 (was 13 in Pass 02 baseline; LaserCursor.vue and its setup add four modules in the graph).
   - Bundle sizes (gzipped): JS **35.30 kB** (Pass 02 baseline was 34.55 kB on `code-cleanup`, but Pass 03 is against `main` which still has the dead files in the tree — they remain unreferenced so they shouldn't be in the bundle; the +0.75 kB delta is from `LaserCursor.vue` itself).
   - Build time: 229 ms.
2. **TypeScript:** `vue-tsc` clean. `LaserCursor.vue` uses `<script setup lang="ts">` with explicit types (`HTMLCanvasElement | null`, `PointerEvent`, `CanvasRenderingContext2D`).
3. **Static lint considerations:**
   - `prefersReducedMotion` is a `const` (not a ref) — correct because once captured at module evaluation it never changes within a session (matchMedia is read synchronously, no listener needed for this use case; if you want runtime-responsive, that's a future enhancement).
   - All event listeners attached in `onMounted` are removed in `onUnmounted`. The `rafId` is cancelled.
   - `points` array is never re-assigned, only mutated. `push` for append, `shift` for prune. Memory is bounded by `TRAIL_MS × pointer-move rate` — a few dozen entries at most.
4. **Manual UI smoke test was not run in this session.** The build verifies the code compiles and bundles, but motion/visual fidelity needs a human eye. Recommended `npm run dev` golden path:
   - Move the mouse around — confirm red trail follows with fading tail.
   - Open the composer modal — confirm trail still appears over the modal overlay.
   - Click buttons and form fields — confirm input still works (laser shouldn't block anything).
   - Toggle the OS "Reduce motion" preference (System Settings → Accessibility → Display on macOS) and reload — confirm laser disappears entirely.
   - On a touch device or DevTools touch-emulation, confirm canvas is hidden.

---

## Branch / git context

- Branched from `main` at `249973b` (not from `code-cleanup`). The Pass 02 deletions live on a separate branch and aren't included here; if the user later merges `code-cleanup` into `main` and then merges `cursor-motion`, there are no expected conflicts because the two branches touch disjoint files.
- Working tree on entering this pass: between Pass 02 and Pass 03 the user committed Pass 02 to `code-cleanup` (`d239f37 "Code cleanup"`, pushed to `origin/code-cleanup`) and reset their local `.gitignore` change. So `src/context/` is currently **not** gitignored on `cursor-motion` — the three context `.md` files appear as untracked. Pass 03's edits to `codebase-overview.md` and the new `changes-03.md` are untracked changes; the user has not been asked to commit them and they remain at the user's discretion.
- The new `src/LaserCursor.vue` IS tracked-able (not gitignored). It currently shows as untracked under the working tree because it's never been added; staging it is the user's decision.
- No commits have been created in this pass. `git status` on `cursor-motion` should show:
  - Untracked: `src/LaserCursor.vue`, `src/context/`
  - Modified: `src/App.vue` (two-line import + one-line template addition).

---

## Updates to `codebase-overview.md`

- **§6 (Repository layout):** added a line for `src/LaserCursor.vue` under `src/`.
- **§14 (Known gotchas and dead code):** appended a Pass 03 bullet to the existing History block.

No other sections were touched. The known gotchas list (now items 1–10) remains accurate. The §15 "What this codebase deliberately does NOT have" list could arguably gain an entry like "No custom cursor styling beyond the laser overlay" but that's the kind of detail that belongs in this changelog rather than the high-level overview.

---

## Notes for future passes

1. **Tunable constants** in `LaserCursor.vue`:
   - `TRAIL_MS` (320) — total tail lifetime. Lower → snappier, higher → more dramatic.
   - Layer widths and alphas — change in the four `strokeSegments(...)` calls. Each takes `(ctx, now, colorFn, baseWidth, taperWidth)`. `baseWidth` is the always-present stroke; `taperWidth` is the additional width that shrinks toward the tail.
   - Head dot radius `3.2`, `shadowBlur: 18`.
2. **Adding a sound or click-burst** would be a natural extension; the architecture already wraps everything in a single component, so a click-fired animation pass could go alongside the existing pointermove handler.
3. **If `--danger` ever changes** in `style.css`, the laser will drift away from the "Everything" colour. The CSS hex values are duplicated in `LaserCursor.vue` because the canvas can't read CSS custom properties without an extra `getComputedStyle` call per frame. If colour-drift becomes a real worry, a one-time `getComputedStyle(document.documentElement).getPropertyValue('--danger')` at mount would solve it.
4. **The dead files from Pass 02 are present on this branch** (because `cursor-motion` branched from `main`, not from `code-cleanup`). They remain unreferenced; the `LaserCursor.vue` import does not bring them back into the bundle.
5. **Bundle baseline going forward:** JS 35.30 kB gz, CSS 5.00 kB gz, 17 modules. If a future change inflates this materially, the laser is a suspect.

---

## Open items / known unfinished work

- **Visual fidelity not human-verified.** Only the build pipeline was run; no `npm run dev` smoke-test. Recommended next step before merging is to eyeball the trail in a real browser session.
- **No regression testing of the prefers-reduced-motion path on a real OS toggle.** Logic is straightforward (a synchronous `matchMedia` check + `v-if`) but worth confirming.
- **No tests added.** Consistent with the project's "no test framework" stance — this is documented in Pass 01 §14 item 4.
