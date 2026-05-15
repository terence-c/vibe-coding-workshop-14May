# Changes — Pass 05

**Date:** 2026-05-15
**Branch:** `cursor-motion` (same branch as Pass 03 / Pass 04, no rebase or branch change in this pass)
**Author of pass:** Claude Code (Opus 4.7) at the user's direction

---

## Summary

Two small follow-ups on top of Pass 04:

1. **Cursor effect — merged the two prior passes.** Brought back the Pass 03 laser trail and combined it with Pass 04's hover-ring, removed the standalone red dot, shrank the expanded ring by ~20 %. Net behaviour: a moving red laser follows the pointer everywhere; when the pointer is over a clickable element, a red ring (34 px) also appears at the cursor position. No standalone dot.
2. **UI parity for the per-task action buttons.** The task-card "Edit" icon button now lights up yellow on hover, mirroring the way the "Delete" icon button lights up red. Implemented via a new generic `.icon-button--accent:hover` modifier in `style.css` — reusable for any future "primary action" icon button.

`npm run build` passes; bundle JS 35.54 kB gz, CSS 5.17 kB gz, 17 modules. Build time 105 ms.

---

## Files modified

| Path | Change |
|---|---|
| `src/CustomCursor.vue` | Rewritten in place. Now renders BOTH a fixed-position `<canvas>` for the laser trail (Pass 03 logic, ported verbatim — four-layer stroke loop, head bright-spot, rAF loop, DPR scaling, prefers-reduced-motion guard) AND a separate fixed-position `<div>` for the hover ring (Pass 04 logic, with the default thin-ring + dot states stripped — the ring only becomes visible when `is-over-interactive` is true). The expanded-ring size dropped from 42 × 42 px to 34 × 34 px (≈ 19 % smaller, rounded from 42 × 0.8 = 33.6). Z-index: trail at 9999, ring at 10000 — ring sits over trail so the hover affordance reads clearly when both are firing in the same area. |
| `src/style.css` | Added a single new rule `.icon-button--accent:hover` (4 lines), placed immediately after `.icon-button--danger:hover` for symmetry. Yellow background (`var(--yellow)`), dark `--ink` text, dark `--ink` border — the exact same shape as the danger rule but with the project's primary accent yellow. |
| `src/App.vue` | One-token change on the per-task Edit button (line ~821): added `icon-button--accent` to its class list. The Delete button (line ~830) already uses `icon-button--danger`. The two now form a matched pair. |
| `src/context/codebase-overview.md` | §6 file tree: updated the `CustomCursor.vue` annotation to reflect that it now combines laser + ring (no dot). §14 History block: appended a Pass 05 bullet. **Not staged** (context dir is untracked on this branch). |

---

## What the cursor does now (state machine)

| User action | Trail (canvas) | Ring (DOM) |
|---|---|---|
| Cursor off-screen / pre-first-move | invisible (no points to draw) | invisible (`opacity: 0` baseline) |
| Cursor moving over non-clickable area | red laser comet follows, fading over 320 ms | invisible — `overInteractive` is false, ring stays at `width: 0` |
| Cursor moving over clickable element (`getComputedStyle(target).cursor === 'pointer'`) | red laser comet still follows | red ring (34 px, 2 px border, faint red fill, red outer glow) appears at cursor |
| Cursor stops moving | trail fades out as existing points age past 320 ms; canvas eventually clears | ring stays visible (size doesn't depend on motion) as long as still hovering a clickable |
| Cursor leaves the document | trail finishes fading; rAF keeps running | `is-visible` flipped off, fades out via opacity transition |
| `prefers-reduced-motion: reduce` | not rendered at all (`v-if` short-circuit, no listeners) | not rendered |
| `@media (hover: none)` | `display: none` | `display: none` |

The two effects are decoupled — the trail's logic doesn't know about the ring, and vice versa. They share four reactive state slots in the script setup (`x`, `y`, `visible`, `overInteractive`), three of which the ring reads and one of which (`overInteractive`) only the ring uses.

## What was explicitly removed

- The persistent **red dot** at the cursor (Pass 04's `.custom-cursor__dot` element and its associated styles). Gone — no element, no class, no rule.
- The **thin default halo ring** (Pass 04's default state of the ring — 14 px, 1.5 px border, 0.7 alpha). Gone — the ring is now invisible until hover.

The laser's own bright "beam tip" spot (drawn inside the canvas via `ctx.arc(...)` after the four stroke passes, with `shadowBlur: 18`) is **kept**, because it is part of the laser's visual identity — removing it would make the beam look decapitated. Note: this is a canvas-drawn graphic at the head of the trail, not a separate DOM element. If the user means this when they say "the dot" in future iterations, we can remove it too.

## Edit-button hover treatment

Before this pass, the per-task action row had:

| Button | Class list | Hover behaviour |
|---|---|---|
| Edit | `icon-button icon-button--ghost` | Generic ghost hover (white background, dark border) — visually neutral, easy to miss |
| Delete | `icon-button icon-button--ghost icon-button--danger` | Red fill + white icon (`.icon-button--danger:hover` in style.css line 291) |

After this pass:

| Button | Class list | Hover behaviour |
|---|---|---|
| Edit | `icon-button icon-button--ghost icon-button--accent` | Yellow (`--yellow #ffc857`) fill + dark icon (new `.icon-button--accent:hover` rule) |
| Delete | `icon-button icon-button--ghost icon-button--danger` | unchanged |

Why yellow specifically: `--yellow` (`#ffc857`) is the project's primary accent. It's the default background of `.submit-button` (style.css line 242) — i.e. the colour of the "New task" / "Add to board" / "Save changes" calls-to-action. Borrowing it for Edit anchors Edit to "primary affirmative action" in the same way Delete is anchored to `--danger` for "destructive action". Semantically parallel.

Why a new `--accent` modifier rather than restyling `.icon-button--ghost:hover`: changing the ghost hover would affect every other ghost icon button across the app (the `Edit` and `Delete` buttons in modals, the toolbar buttons, etc.). Adding a new modifier keeps the change surgical and reusable.

## Verification

1. **Build:** `npm run build` clean in 105 ms.
   - Module count: 17 (unchanged — same files, just rewrites).
   - Bundle (gzipped): **JS 35.54 kB** (Pass 04 was 34.95 kB; +0.59 kB from re-adding the canvas/rAF code), **CSS 5.17 kB** (Pass 04 was 5.20 kB; ~−0.03 kB — slightly less CSS because the default ring + dot styles were removed, partially offset by the new `--accent` rule).
2. **TypeScript:** clean.
3. **Manual UI verification not done in this session** — same caveat as Pass 03 / Pass 04. Suggested smoke-test path:
   - Move the mouse over blank space → red laser trail with fading tail, no ring.
   - Move the mouse onto a button / chip / stat card → laser keeps going, red ring (34 px) appears at the cursor.
   - Move off → ring fades away, laser keeps going.
   - Hover over a task card's Edit button → button background turns yellow, icon stays dark.
   - Hover over the Delete button → unchanged (red fill, white icon).
   - Open the composer modal → cursor effects still appear over the modal (z-index 9999 / 10000).
   - Toggle macOS Reduce Motion ON → no cursor effects at all, edit hover still works normally (CSS only, no JS path).

---

## Branch / git context

- Still on `cursor-motion`, still based on `main` at `249973b`. No new commits.
- `git status` on `cursor-motion` after this pass:
  - **Modified, tracked:** `src/App.vue` (import + tag rename from Pass 04, plus the Edit button class addition from Pass 05 — all three edits live in this single tracked diff). `src/style.css` (the new `--accent` rule is the only Pass 05 addition; nothing else in the file was touched).
  - **Untracked:** `src/CustomCursor.vue`, `src/context/*.md`.
- Nothing has been committed across Passes 03 / 04 / 05. If the user wants to land all three on `cursor-motion`, a single commit covering the final state is reasonable; the history of laser → ring → laser+ring lives entirely in `src/context/changes-NN.md`.

---

## Notes for future passes

1. **The `--accent` modifier is now a public part of the icon-button vocabulary.** If a future pass adds another "primary action" icon button somewhere, adding `icon-button--accent` will give it the same yellow hover for free.
2. **The cursor file is starting to do two jobs.** `CustomCursor.vue` now manages both a canvas trail and a DOM ring, with shared state. If a future pass wants to add a third effect (a click pulse, for example), the file is borderline-too-big to keep growing. A split into `CursorTrail.vue` + `CursorRing.vue` (each ~60 lines) and a thin `CustomCursor.vue` wrapper that mounts both is a reasonable refactor point — not necessary yet.
3. **Both Pass 03 and Pass 04's history have been preserved** as `changes-03.md` and `changes-04.md` even though their isolated deliverables don't exist on the working tree anymore (Pass 03's `LaserCursor.vue` was deleted in Pass 04; Pass 04's dot + default ring were removed in Pass 05). The chain is: 03 added laser → 04 swapped to ring+dot → 05 merged laser+ring, dropped dot. If the user wants to collapse, `changes-03.md` and `changes-04.md` could be merged into a single "cursor effect evolution" doc — leaving as separate for now to preserve the audit trail.
4. **Tunable constants** are the same as Pass 03:
   - Cursor: `TRAIL_MS` (320 ms) for trail fade; the four `strokeSegments(...)` calls for layer widths/colours; ring `width/height` (34 px) and `border` (2 px) in `.is-over-interactive .custom-cursor__ring`.
   - Edit button: `var(--yellow)` in the new `.icon-button--accent:hover` rule. Swap to `var(--teal)` for a cooler accent, etc.

## Open items / known unfinished work

- Visual / interaction fidelity unverified by human eye (same caveat as Passes 03 / 04).
- No tests added (consistent with project posture; see `codebase-overview.md` §14).
- The `CustomCursor.vue` file is currently the only place the Pass 03 laser logic lives. If the user ever wants to *also* keep a "pure laser" mode (without the ring), the cleanest path is the `Trail` / `Ring` split described above.
