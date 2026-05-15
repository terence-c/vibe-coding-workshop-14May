# Changes — Pass 04

**Date:** 2026-05-15
**Branch:** `cursor-motion` (still on the same branch as Pass 03 — this pass replaces, rather than stacks on top of, that pass's deliverable)
**Author of pass:** Claude Code (Opus 4.7) at the user's direction

---

## Summary

Replaced the laser-trail cursor effect from Pass 03 with a click-affordance custom cursor. Instead of a comet-style trail following the mouse, the pointer now shows a small red dot that **expands into a red ring** whenever it is over a clickable element. Same red palette anchored on the masthead "Everything" headline (`--danger #e5392d`). Native OS cursor is still kept; the custom effect is additive.

`npm run build` passes; bundle JS shrank slightly vs Pass 03 (no canvas/rAF code), CSS grew slightly (more scoped styles).

---

## Files added

| Path | Lines | Purpose |
|---|---|---|
| `src/CustomCursor.vue` | 119 (TS + template + scoped CSS) | Click-affordance custom cursor: small red dot + thin halo by default, morphs into a clear red ring over clickable elements. |

## Files deleted

| Path | Why |
|---|---|
| `src/LaserCursor.vue` | Pass 03's canvas-based laser trail. The user reframed the requirement away from a laser/trail to a click-target indicator. The whole component became obsolete; deleted rather than left as dead code. The file was never committed (untracked on `cursor-motion`), so `rm` was used instead of `git rm`. |

## Files modified

| Path | Change |
|---|---|
| `src/App.vue` | Two one-line edits: changed the import from `import LaserCursor from './LaserCursor.vue'` to `import CustomCursor from './CustomCursor.vue'`, and the tag in the template from `<LaserCursor />` to `<CustomCursor />`. Location and surroundings unchanged. |
| `src/context/codebase-overview.md` | §6 file tree: replaced the `LaserCursor.vue` line with a `CustomCursor.vue` line. §14 History block: appended a Pass 04 bullet that records the pivot (Pass 03's deliverable was removed, not extended). **Not staged** (context dir is untracked on this branch). |

---

## Why the pivot

The user's prior direction was "laser-like motion, following the pointer". This pass's direction is "**instead of doing a laser**, let's improve such that the pointer will change into a shape, like a circle, **for items that can be clicked on**."

The two are not subtle variants of the same thing — they have different intents:

| Pass 03 (laser) | Pass 04 (custom cursor) |
|---|---|
| Decorative motion — a trail that follows the cursor everywhere | Functional affordance — show users *where they can click* |
| Visual emphasis is on *motion* (the comet streak) | Visual emphasis is on *target identification* (the ring growing on hovered clickables) |
| Always active over the viewport | Only "fires" the morph when hovering a `cursor: pointer` element |
| Implemented in `<canvas>` + `requestAnimationFrame` (needed for per-segment alpha fade) | Implemented in plain DOM + CSS transitions (no rAF needed) |

The pivot was a replacement, not an extension, so the laser code was removed entirely.

---

## What "clickable" means in this implementation

The interactive-target detection uses **`getComputedStyle(target).cursor === 'pointer'`** rather than a selector list. Reasons:

- It's exactly what the user sees: anything the browser would render with a pointing-hand cursor.
- This codebase liberally sets `cursor: pointer` on `.icon-button`, `.ghost-button`, `.submit-button` (see `src/style.css` line 245), so the selector list would have to enumerate all of them. The computed-style check picks them up for free.
- New elements added later (e.g. by future passes) will work automatically as long as they get `cursor: pointer` (which the project's style conventions already do).

Edge cases handled:
- The check is wrapped in `try/catch` because `getComputedStyle` can throw on detached/non-element targets (e.g. text nodes, SVG `<use>` shadow content).
- `pointerover` is used (which bubbles) rather than `mouseenter` (which doesn't bubble) so a single listener on `window` covers the whole tree.
- `pointerType === 'touch'` is filtered out — taps shouldn't trigger the ring.

---

## Design / look

- **Default state** (free-roaming over non-clickable area):
  - A 6 px solid red dot (`#e5392d`, matching `--danger` / the "Everything" colour).
  - Wrapped by a thin 14 px ring at 70 % alpha. Soft glow via `box-shadow`.
- **Hovered-clickable state**:
  - The dot shrinks (4 px) and fades to invisible.
  - The ring grows to 42 px, gets a 2 px solid red border, a faint red fill (`rgba(229, 57, 45, 0.08)`), and a soft red outer glow.
  - The transition uses `cubic-bezier(0.2, 0.8, 0.2, 1)` — fast attack, smooth settle, feels intentional rather than mushy.
- **Page-leave**: opacity fades to 0 when the pointer exits the document; restores on re-entry.

Three CSS colour values are hardcoded in the scoped style: `#e5392d`, `#c41a0f`, and the rgba derivatives. These correspond to `--danger` and `--danger-dark` in `src/style.css`. They are hardcoded rather than read via `var(--danger)` because scoped styles can use CSS custom properties just fine — this was a deliberate choice for self-containment and parity with Pass 03's component, which also hardcoded the canvas colour stops (canvas can't read CSS vars without an extra DOM read). If the project ever rebrands away from red, both `--danger` in `style.css` *and* the literals in `CustomCursor.vue` must be updated. See `codebase-overview.md` §14 for the existing version of this gotcha.

---

## Implementation notes (`src/CustomCursor.vue`)

- **Rendering tech:** Plain DOM. One root `<div>` positioned with `transform: translate(x, y)` on every `pointermove`; two inner `<span>` elements (dot + ring) animated via CSS transitions on size/opacity/border. No canvas, no rAF, no animation library.
- **Position update path:** `pointermove` → write `x.value`, `y.value` → Vue reactivity → inline `:style="{ transform: ... }"`. Browsers batch this efficiently; no visible jitter at 60 Hz on a normal mouse.
- **Why no transition on the parent's transform:** the parent must follow the cursor *immediately* (any easing on translation would feel like input lag). Only the inner dot/ring sizes are eased.
- **`will-change: transform`** on the root tells the browser to promote the element to its own compositor layer, keeping the transform cheap.
- **Reactive state:** `x`, `y`, `visible`, `overInteractive`. All four are `Vue.ref<…>`. Minimal — no per-frame array buffering as in Pass 03.
- **Listeners:** `pointermove` and `pointerover` on `window` (passive), `pointerleave` and `pointerenter` on `document.documentElement` (for show/hide on viewport-edge crossings).

## Accessibility & graceful degradation

Same guardrails as Pass 03:
- `prefers-reduced-motion: reduce` → component short-circuits (no listeners, no render).
- `@media (hover: none)` → `display: none` on the wrapper.
- `pointerType === 'touch'` filtered out in the move handler.
- `aria-hidden="true"` on the cursor element.
- Native OS cursor not hidden; users with cursor customisations / assistive software still see their normal pointer.

---

## Verification

1. **Build:** `npm run build` → `vue-tsc -b && vite build` both pass.
   - Module count: 17 (same as Pass 03 — one Vue SFC replaced another).
   - Bundle (gzipped): **JS 34.95 kB** (Pass 03 was 35.30 kB; saved 0.35 kB by dropping the canvas/rAF code), **CSS 5.20 kB** (Pass 03 was 5.00 kB; gained 0.20 kB from the additional scoped styles for dot/ring states).
   - Build time: 114 ms.
2. **TypeScript:** clean. The component uses `<script setup lang="ts">` with explicit `Element | null` and `PointerEvent` types.
3. **No manual UI smoke test in this session.** Same caveat as Pass 03 — needs eyeballing in `npm run dev`. Recommended check path:
   - Move the mouse across blank space → small red dot follows with thin ring.
   - Hover a button / chip / stat card / icon button → ring expands to ~42 px, dot fades.
   - Move off the button → ring shrinks back, dot reappears.
   - Hover the inside of a text input → ring should NOT expand (the browser shows an I-beam, not a pointer).
   - Move the cursor out of the window → custom cursor fades. Re-enter → restores.
   - Open the composer modal → cursor still works over modal contents (it sits at `z-index: 9999`).
   - macOS System Settings → Accessibility → Display → Reduce motion ON → reload → no custom cursor at all.
   - DevTools touch emulation → cursor hidden.

---

## Branch / git context

- Still on `cursor-motion`, still based on `main` at `249973b`. No new commits.
- `git status` on `cursor-motion` after this pass:
  - **Modified, tracked:** `src/App.vue` — net diff is one import line and one tag, identical in scope to Pass 03.
  - **Untracked:** `src/CustomCursor.vue`, `src/context/*.md`.
- Pass 03's `src/LaserCursor.vue` was never staged, so its deletion does not appear as a tracked `D` entry — it's simply gone from the working tree and from `git status`. (If you wonder where Pass 03 went, this file is the trail.)

---

## Notes for future passes

1. **The pivot moves the cursor from a decorative effect to a UX affordance.** That changes the design conversation if a Pass 05 happens: should the ring also animate on click (a "press" pulse)? Should it adopt the colour of the hovered element (orange for the FAB, danger for the delete button) rather than always red? Either is a small extension.
2. **`getComputedStyle` is called once per `pointerover` event** — not per frame. So performance is bound by *how often the cursor crosses element boundaries*, not by mouse-move rate. Effectively free.
3. **If the project ever sets `cursor: pointer` on a non-clickable element for visual reasons** (it doesn't today), the ring would trigger there. Not a current concern but worth knowing.
4. **The custom cursor sits at z-index 9999.** Modals are below it (they sit at the default stacking inside `.modal-overlay`). The cursor floats over everything.
5. **Both this file (`changes-04.md`) and `changes-03.md` are kept** in `src/context/` even though Pass 03's deliverable was removed. The historical record makes the pivot visible. If the user later wants to collapse history, they can prune.

## Open items / known unfinished work

- Visual / interaction fidelity unverified by human eye.
- No regression on the existing keyboard shortcuts (`N`, `/`, `J`, `?`, Esc) was actively tested — but no event handlers were added that could swallow keys.
- No tests added (consistent with project posture; see `codebase-overview.md` §14).
