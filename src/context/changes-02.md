# Changes — Pass 02

**Date:** 2026-05-14
**Branch:** `code-cleanup` (branched from `main` at commit `249973b Restore Disqus comments section`)
**Working tree before this pass:** dirty — uncommitted edit to `.gitignore` adding `.claude` and `src/context` (carried over from `main`). No conflict; carried into the new branch as-is.
**Author of pass:** Claude Code (Opus 4.7) at the user's direction

---

## Summary

Removed all redundant / unused source files identified in Pass 01's gotchas section, plus one additional dead file (`public/icons.svg`) discovered during re-verification in this pass. Build (`npm run build` → `vue-tsc -b && vite build`) passes clean after deletion. No application behaviour changed — only dead code was removed.

All deletions are **staged but not committed**. The user has gitignored `src/context/`, so context-doc edits in this pass are local-only and intentionally not staged.

---

## Files deleted (staged via `git rm`)

| Path | Why it was dead |
|---|---|
| `src/components/HelloWorld.vue` | Vite-template leftover. `grep -rn HelloWorld` across the repo returned zero importers. |
| `src/assets/hero.png` | Only referenced from `HelloWorld.vue` (line 4 import). |
| `src/assets/vite.svg` | Only referenced from `HelloWorld.vue` (lines 3, 15, 38). |
| `src/assets/vue.svg` | Only referenced from `HelloWorld.vue` (lines 5, 14, 44). |
| `public/icons.svg` | **Newly discovered in this pass.** Only referenced from `HelloWorld.vue` (lines 31, 52, 60, 68, 76, 84) as `<use href="/icons.svg#…">` — all six references died with the component. |

## Directories removed

| Path | Reason |
|---|---|
| `src/components/` | Empty after deleting `HelloWorld.vue`. Removed via `rmdir`. Not a tracked entity in git, so no git operation needed. |
| `src/assets/` | Empty after deleting the three SVG/PNG files. Removed via `rmdir`. |

## Files modified

| Path | Change |
|---|---|
| `src/context/codebase-overview.md` | §6 file tree: removed `assets/`, `components/`, and the `public/icons.svg` line; updated the `public/favicon.svg` annotation to reflect that nothing in `index.html` links to it. §14 gotchas: removed the two dead-code entries (former items 1 & 2), renumbered the remaining items 1–9, and added a new item 10 about the missing `<link rel="icon">` (a real residual gotcha now that `icons.svg` is gone — same family of "icon plumbing isn't wired up"). Added a short "History" note at the bottom of §14 pointing to this changelog. Updated the footer's "Last verified" line to be self-updating. **Not staged** (gitignored). |

## Files kept that *could* have been candidates

| Path | Why kept |
|---|---|
| `public/favicon.svg` | No explicit reference in `index.html`, but browsers conventionally auto-request `/favicon.svg` / `/favicon.ico` at the root. Removing it would silently drop the site icon. "Without breaking the system" → leave it. |

---

## Why

User asked, on the `code-cleanup` branch, to remove redundant unused code without breaking the system, following the Pass 01 gotchas list. The Pass 01 list was used as the starting point but each entry was re-verified by fresh `grep` rather than trusted blindly — that re-verification turned up the additional `public/icons.svg` candidate.

---

## Verification done during this pass

1. **Pre-deletion grep on `code-cleanup` branch:**
   - `grep -rn "HelloWorld"` across all `.vue/.ts/.js/.html/.json/.css` (excluding `node_modules`, `.git`, `dist`, `package-lock`) → **zero matches**.
   - `grep -rn "hero\.png\|hero'"` → only `src/components/HelloWorld.vue:4`.
   - `grep -rn "vite\.svg\|viteLogo"` → only `HelloWorld.vue` (3 lines).
   - `grep -rn "vue\.svg\|vueLogo"` → only `HelloWorld.vue` (3 lines).
   - `grep -rn "favicon"` across HTML/Vue/TS/JS/JSON(C) → **zero matches** (so `favicon.svg` survives only on browser convention, see "Files kept").
   - `grep -rn "icons\.svg\|/icons"` → only `HelloWorld.vue` (6 lines) — confirmed `icons.svg` death.

2. **`git ls-files`** confirmed all five target files are tracked → used `git rm` (not plain `rm`) so the deletions are recorded.

3. **Post-deletion `git status`** shows exactly 5 staged deletions, plus the unrelated `.gitignore` modification carried over from `main`.

4. **Build:** `npm run build` →
   - `vue-tsc -b` passes (no orphan import errors).
   - `vite build` succeeds in **126 ms**, emitting `dist/index.html`, `dist/assets/index-…css`, `dist/assets/index-…js`, plus Wrangler artefacts.
   - Bundle sizes (gzipped): JS 34.55 kB, CSS 4.94 kB. Smaller than before (no SVG/PNG static-copy overhead and no unused module graph).

5. **Spot-checks of the app entry path:** `src/main.ts` imports only `./style.css` and `./App.vue`. `App.vue` imports only from `vue` and `./tasks.js`. `tasks.js` has no imports. None of these touch any of the deleted files.

---

## Updates to `codebase-overview.md`

- **§6 (Repository layout):** removed `src/assets/`, `src/components/`, and the `public/icons.svg` entries. Updated `public/favicon.svg`'s annotation.
- **§14 (Known gotchas and dead code):** removed the two dead-code entries (former items 1 & 2). Renumbered the rest from 1 to 9. Added a new item 10 about `index.html` having no `<link rel="icon">`. Added a "History" note linking to this file.
- **Footer:** generalised the "Last verified" line to point at the latest `changes-NN.md` instead of pinning to `01`.

The §15 "What this codebase deliberately does NOT have" list was not updated — its items are still accurate.

---

## Notes for future passes

1. **Commit state at end of Pass 02:** all five deletions are staged on `code-cleanup`; the `.gitignore` edit is unstaged on the same branch; no commit has been created. The user controls when/whether to commit and merge.
2. **If you merge `code-cleanup` into `main`,** there are no expected conflicts — the deleted files were all leaves in their respective subdirectories and aren't touched on `main` since branching.
3. **The directories `src/components/` and `src/assets/` no longer exist.** If you intend to add components or local assets later, re-create them — there's no convention that says they must live under those names; you could equally co-locate alongside `App.vue` for now while the app is still single-component.
4. **Bundle size dropped slightly** post-cleanup. If you ever need to compare future bundle-size changes against a baseline, the post-Pass-02 numbers above (JS 34.55 kB gz, CSS 4.94 kB gz) are a clean reference point.
5. **No app behaviour changed.** A manual UI smoke-test was not run in this pass because the deletions were pure removal of unreachable code; `vue-tsc` + `vite build` cover the only ways this kind of change could break.

---

## Open items / known unfinished work

*(none from this pass — work is complete pending user review of the staged diff and decision to commit/merge)*
