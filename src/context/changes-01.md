# Changes — Pass 01

**Date:** 2026-05-14
**Branch:** `main`
**Working tree before this pass:** clean (last commit `249973b Restore Disqus comments section`)
**Author of pass:** Claude Code (Opus 4.7) at the user's direction

---

## Summary

Established the `src/context/` documentation system. Created a comprehensive codebase overview so future Claude Code sessions can skip re-exploration, and set up the running change-log convention.

No application source code (`App.vue`, `tasks.js`, `style.css`, configs) was modified in this pass. Only docs under `src/context/` were added.

---

## Files added

| Path | Purpose |
|---|---|
| `src/context/codebase-overview.md` | Long-form, comprehensive map of the codebase: stack, deployment, file layout, persistence layer, UI state model, template structure, CSS conventions, configs, keyboard shortcuts, gotchas, and an explicit list of what the project does *not* contain. Verified against actual source — no guesses. |
| `src/context/changes-01.md` | This file. Establishes the changelog format. |

## Files modified

*(none)*

## Files deleted

*(none)*

---

## Why

The user wants `src/context/` to act as durable session memory — load it once at the start of any new chat and skip re-exploring the codebase from scratch. The pair (`codebase-overview.md` + the latest `changes-NN.md`) is the intended context payload.

The overview file is intentionally long and not optimised for token cost — the user explicitly said comprehensiveness matters more than length.

---

## Verification done during this pass

- Read all source files end-to-end: `index.html`, `package.json`, `vite.config.ts`, `wrangler.jsonc`, `tsconfig*.json`, `src/main.ts`, `src/tasks.js`, `src/App.vue` (all 1082 lines), prefix of `src/style.css`, `src/components/HelloWorld.vue`, `.claude/settings.local.json`, `README.md`.
- Confirmed dead code via `grep -r HelloWorld src/` (no importers) and inspecting `HelloWorld.vue` imports (only consumer of `hero.png`, `vue.svg`, `vite.svg`).
- Confirmed `src/context/` did not exist before this pass (`ls` returned "context folder does not exist").
- Captured the live `git log --oneline -10` snapshot inside the overview.
- All exported APIs in `tasks.js` are documented with their actual signatures, defaults, and return values as read from the file.
- All keyboard shortcuts, modal flows, computed properties, and template sections in `App.vue` are documented from the actual source.

---

## Notes for future passes

1. **At the start of every new Claude Code chat**, load `src/context/codebase-overview.md` plus the latest `src/context/changes-NN.md`. Together they replace re-exploration.
2. **When you make changes**, create `changes-NN.md` with the next zero-padded number (this one is `01`, next is `02`, then `03`, ...). Do not edit older `changes-NN.md` files — they are an append-only history.
3. **When `codebase-overview.md` goes stale**, edit it in the same pass and call out the edit in that pass's `changes-NN.md`. The overview reflects the *current* state of the code; the `changes-NN.md` files reflect *what moved*.
4. **Template for the next entry:**

   ```markdown
   # Changes — Pass NN

   **Date:** YYYY-MM-DD
   **Branch:** <branch>
   **Working tree before this pass:** <clean | summary of dirty state>
   **Last commit at start:** <short-sha> <subject>
   **Author of pass:** Claude Code (<model>) at the user's direction

   ## Summary
   <1–3 sentences>

   ## Files added / modified / deleted
   <tables or bullet lists>

   ## Why
   <user intent + any constraints>

   ## Verification done during this pass
   <what was tested, how, results>

   ## Updates to codebase-overview.md
   <list of sections changed, or "none">

   ## Notes for future passes
   <anything non-obvious the next session should know>
   ```

5. **If a pass discovers that the overview is wrong**, fix the overview *and* note the correction in that pass's changes file under "Updates to codebase-overview.md".

---

## Open items / known unfinished work

*(none — this pass is purely additive documentation)*