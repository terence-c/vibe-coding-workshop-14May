# Changes — Pass 06

**Date:** 2026-05-15
**Branch:** `v1-improvements`
**Working tree before this pass:** dirty — partial UX-overhaul edits already existed in `src/App.vue` and `src/tasks.js`; `src/style.css` and `index.html` were still untouched for this pass.
**Last commit at start:** `7820c31 Added cursor motion`
**Author of pass:** Codex at the user's direction

---

## Summary

Completed the Tier 1 workshop/demo UX overhaul that had been sketched in the conversation: a consolidated Today hero, collapsed filters, pinned/manual ordering, mobile swipe gestures, undo toasts, completion celebration, inline title editing, and responsive styling for the new states. Also added the explicit favicon link that the context docs had been carrying as a known polish gap.

`npm run build` passes. A local dev server is running at `http://127.0.0.1:5173/` and returned HTTP 200 via `curl`.

---

## Files modified

| Path | Change |
|---|---|
| `src/App.vue` | Added `pinned` to the Task interface; added Manual sort; rewired `visibleTasks` so pinned open tasks float and done tasks sink; replaced masthead/stat-row/spotlight with `.today-hero`; collapsed category/priority chips behind a Filters disclosure; added pin toggle, manual drag/drop, touch swipe right/left, delete/clear undo toasts, completion burst state, and inline title editing. Removed the delete-confirmation modal path. |
| `src/tasks.js` | Added `pinned` to seeds and `createTask`; added `migrate()` for legacy localStorage tasks; added `togglePinned(id)` and `reorderTasks(orderedIds)`. |
| `src/style.css` | Added the visual layer for the new UX: Today hero, hero stat pills, filter disclosure, swipe reveal zones, drag target states, pinned styling, inline edit input, stronger overdue left border, action toast progress, completion particles, focus-visible styling, and responsive mobile rules. |
| `index.html` | Added `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`. |
| `src/context/codebase-overview.md` | Updated the overview to reflect the current `v1-improvements` shape and corrected branch-specific dead-file notes. |

---

## Why

The user selected "Mock first, build after" and then chose:

- Today hero Variant A — spotlight-led, stats inline.
- Keep topbar everywhere; no mobile bottom nav.
- Skip calendar for now.
- Proceed on a new branch named `v1-improvements`.

This pass implements that chosen build scope and intentionally leaves calendar, dark mode, subtasks, tags, and bottom nav out.

---

## Verification done during this pass

1. **Build:** `npm run build` passes (`vue-tsc -b && vite build`).
   - Output: 17 modules transformed.
   - Bundle sizes from the latest run: CSS **30.38 kB** (6.66 kB gzip), JS **105.90 kB** (38.28 kB gzip).
2. **Dev server:** first sandboxed attempt failed because the Cloudflare Vite plugin could not bind its local inspector port. Re-ran with approved escalation.
   - Running URL: `http://127.0.0.1:5173/`.
   - `curl -I http://127.0.0.1:5173/` returned **HTTP/1.1 200 OK**.
3. **Browser/plugin note:** the Browser plugin instructions were available, but the Node/browser-control runtime tool was not exposed in this session. No visual screenshot smoke test was completed.

---

## Updates to `codebase-overview.md`

- **§1:** updated App/style line-count estimates.
- **§6:** corrected current tree for this branch, including the still-present Vite-template dead files and explicit favicon link.
- **§7–§10:** updated boot sequence, persistence API, Task shape, App state, computed values, mutation handlers, template structure, styling conventions, and shortcuts.
- **§13–§15:** updated recent history, known gotchas, history block, and "deliberately does not have" list.

---

## Notes for future passes

1. **Visual QA remains the most important next check.** Build is green, but swipe/drag density and Today hero spacing should be eyeballed in the browser on desktop and mobile widths.
2. **Manual sorting is persisted as list order in localStorage.** Pinned open tasks still float above unpinned tasks even when Sort is Manual, so dragging an unpinned card above a pinned card will not visually overtake it until it is pinned too.
3. **Delete and Clear done are now undo-toast flows.** There is no delete-confirmation modal anymore. Undo restores a full snapshot of the task array.
4. **This branch still has the Vite-template dead files.** Pass 02 cleaned them on a separate `code-cleanup` branch, but `v1-improvements` was branched from the cursor-motion lineage where those files still exist.
5. **Disqus remains intentionally untouched.** It is still loaded on mount and still uses `test-zy3jl34rlf`.

## Open items / known unfinished work

- No human visual smoke test or mobile device test completed in this session.
- No automated tests added; the project still has no test framework.
- Calendar view, bottom nav, bulk multi-select, subtasks, dark mode, and search highlighting remain future work.
