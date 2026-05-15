# Changes — Pass 07

**Date:** 2026-05-15
**Branch:** `v1-improvements`
**Working tree before this pass:** dirty from Pass 06 work on `src/App.vue`, `src/style.css`, `src/tasks.js`, and context docs.
**Last commit at start:** `7820c31 Added cursor motion`
**Author of pass:** Codex at the user's direction

---

## Summary

Added the requested calendar and recurrence improvements:

- Board ↔ Calendar view toggle in the toolbar.
- Themed month calendar with task dots, month navigation, Today jump, and selected-day agenda.
- Recurring task controls in both New task and Edit task modals.
- Recurring completion behavior: completing an open recurring task advances its due date to the next occurrence and keeps it open.
- Recurrence badges on cards and calendar agenda items.
- Removed the non-keyboard "Click title", "Drag handle", "Swipe →", and "Swipe ←" rows from the Keyboard shortcuts modal.

`npm run build` passes. The existing local dev server at `http://127.0.0.1:5173/` returned HTTP 200 via `curl`.

---

## Files modified

| Path | Change |
|---|---|
| `src/App.vue` | Added `ViewMode`, `Recurrence`, and `CalendarDay` types; added recurrence options, view options, calendar formatters, calendar state, recurrence date-advance helpers, calendar computed data, calendar navigation handlers, recurrence-aware completion behavior, recurrence form fields, Board/Calendar toolbar toggle, calendar template, recurrence badges, and removed the gesture/action rows from shortcuts. |
| `src/tasks.js` | Added `recurrence` to seed tasks, migration defaults, and `createTask` defaults/input handling. |
| `src/style.css` | Added themed calendar grid/agenda styles, recurrence pill styles, view-toggle icon styling, responsive calendar rules, and adjusted the task form grid for the new recurrence field. |
| `src/context/codebase-overview.md` | Updated line counts, data contract, App state/computed/handlers/template notes, shortcuts, gotchas/history, and removed "No calendar view" from the deliberate non-features list. |

---

## Recurrence behavior

Supported recurrence values are:

- `none`
- `daily`
- `weekly`
- `monthly`
- `yearly`

When a non-recurring task is checked, it behaves as before (`done` toggles). When an open recurring task is checked, the app:

1. Calculates the next occurrence after today.
2. Updates `due` to that next occurrence.
3. Leaves `done: false`.
4. Shows the completion burst and an info toast.

Monthly and yearly recurrence clamp end-of-month dates so a Jan 31-style date does not drift unpredictably.

---

## Verification done during this pass

1. **Build:** `npm run build` passes (`vue-tsc -b && vite build`).
   - Output: 17 modules transformed.
   - Bundle sizes from the latest run: CSS **34.30 kB** (7.27 kB gzip), JS **112.91 kB** (39.92 kB gzip).
2. **Dev server:** `curl -I http://127.0.0.1:5173/` returned **HTTP/1.1 200 OK**.
3. **Visual/browser caveat:** no automated browser screenshot pass was available in this session.

---

## Updates to `codebase-overview.md`

- **§1 / §6 / §9 / §10:** updated line counts and current UI architecture.
- **§8:** documented the new `recurrence` task field and persistence defaults.
- **§9:** documented recurrence helpers, calendar state/computed values, and recurrence-aware completion behavior.
- **§12:** removed the non-keyboard rows from the shortcut table.
- **§14 / §15:** appended Pass 07 history and removed "No calendar view" from the deliberate non-features list.

---

## Notes for future passes

1. **Calendar view is derived from `visibleTasks`.** Search, status, category, and priority filters all apply to both Board and Calendar.
2. **Recurring tasks do not create duplicates.** They move their due date forward when completed. If the product later needs completion history, that is a new data model.
3. **Calendar selected-day agenda has edit and complete/reopen actions, but not delete.** Delete remains available in Board view and edit flows can still be used for details.
4. **No custom recurrence intervals yet.** "Every 2 weeks", weekday-only, and end-after-N-runs are intentionally out of scope for this pass.

## Open items / known unfinished work

- Human visual QA at desktop and mobile widths is still recommended.
- No automated tests added; project still has no test framework.
- Bulk multi-select and search highlighting remain future work.
