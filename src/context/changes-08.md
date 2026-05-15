# Changes — Pass 08

**Date:** 2026-05-15
**Branch:** `v1-improvements`
**Working tree before this pass:** dirty from the in-progress v1 improvements work, including Pass 07 calendar/recurrence changes.
**Last commit at start:** `7820c31 Added cursor motion`
**Author of pass:** Codex at the user's direction

---

## Summary

Fixed the recurrence calendar bug and added recurrence end dates.

Before this pass, the calendar only mapped each task to `task.due`, so daily/weekly recurring tasks did not expand across the month grid. The calendar now generates occurrences across the visible 6-week calendar range, so daily/weekly/monthly/yearly tasks appear on every matching date. Composer and edit modals now include a conditional **Repeat until** date field for recurring tasks.

`npm run build` passes. The existing local dev server at `http://127.0.0.1:5173/` returned HTTP 200 via `curl`.

---

## Files modified

| Path | Change |
|---|---|
| `src/App.vue` | Added `recurrenceEnd` to `Task`; added `newRecurrenceEnd` and `editRecurrenceEnd`; replaced single-date calendar mapping with generated `CalendarOccurrence` records; added recurrence end validation; added end-of-series completion behavior; updated calendar agenda actions to complete the selected occurrence; added conditional "Repeat until" fields in New/Edit modals. |
| `src/tasks.js` | Added `recurrenceEnd` to seed tasks, migration defaults, and `createTask` defaults/input handling. |
| `src/style.css` | Added small recurrence-end label styling and recurring occurrence marker styling in the calendar dots. |
| `src/context/codebase-overview.md` | Updated the data contract, recurrence/calendar helper descriptions, line counts, and history notes for Pass 08. |

---

## Recurrence behavior after this fix

Calendar generation:

- Non-recurring tasks appear only on `task.due`.
- Done tasks appear only on their stored `task.due`.
- Open recurring tasks generate occurrences from `task.due` forward.
- Occurrences stop at `recurrenceEnd` when it is set.
- Empty `recurrenceEnd` means no end date; the calendar still only generates within the visible 6-week grid, so there is no unbounded expansion.

Completion:

- Completing a recurring task from Board advances from its current `due`.
- Completing a recurring occurrence from Calendar advances from the selected occurrence date.
- If the next occurrence would be after `recurrenceEnd`, the series is marked done.
- Monthly/yearly recurrence continues to clamp end-of-month dates.

Validation:

- `Repeat until` is only shown when recurrence is not `none`.
- `Repeat until` must be on or after the due date.
- Switching recurrence back to `none` clears the stored end date.

---

## Verification done during this pass

1. **Build:** `npm run build` passes (`vue-tsc -b && vite build`).
   - Output: 17 modules transformed.
   - Bundle sizes from the latest run: CSS **34.45 kB** (7.32 kB gzip), JS **115.54 kB** (40.71 kB gzip).
2. **Dev server:** `curl -I http://127.0.0.1:5173/` returned **HTTP/1.1 200 OK**.

---

## Notes for future passes

1. **Calendar now uses occurrence records, not raw task arrays.** Template code that reads calendar data should expect `{ id, date, task, isRecurring }`.
2. **Recurring tasks still do not create historical child tasks.** There is one task record whose next due date advances.
3. **No custom recurrence patterns yet.** The recurrence model remains fixed to daily/weekly/monthly/yearly plus an optional end date.
4. **Visual QA recommended:** especially daily tasks on a dense month, mobile calendar cells, and editing an end date before/after the start date.

## Open items / known unfinished work

- No automated tests added; the project still has no test framework.
- No browser screenshot verification was available in this session.
