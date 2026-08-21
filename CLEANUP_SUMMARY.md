# apps/start cleanup — `global-cleanup` branch

Branched off `SAY-63`. Everything below is staged but **not committed** — review with `git diff --cached` (or your GUI of choice) before committing. 146 files touched, all inside `apps/start` except one addition to `packages/util`.

This was done with a fleet of parallel research + worker agents (structure mapping, task/panel deep-dive, duplication hunting, then mechanical migration/rename batches), verified with `tsc --noEmit`, `biome check`, and live browser testing against the running dev server after each risky change.

## What actually mattered most: the task/panel architecture

You specifically called out panels needing real headers and discoverable content. The audit found the admin task panel (`components/admin/panels/task.tsx`) already did this right — but two other task-viewing surfaces didn't:

### Public task page (`/orgs/$orgSlug/$shortId`)
The panel header and body (vote/status/priority/category/release/label tiles) were inlined inside the same 475-line file as the main task content, and `setPanelContent` was being re-called on every render with a hand-built JSX blob closing over 9 pieces of state — the opposite of the pattern documented in the `page-component` skill ("panel components read from context, not props; set once").

Fixed by extracting the same shape the admin panel already uses:
- **New:** `apps/start/src/contexts/ContextPublicOrgTask.tsx` — a `PublicTaskProvider` that owns the live task state (SSE-synced), vote state, and membership check, mirroring `ContextOrgTask.tsx`'s pattern.
- **New:** `apps/start/src/components/public/panels/task.tsx` — `PublicTaskPanelHeader` / `PublicTaskPanelContent`, both reading from `usePublicTask()`. Handed to the panel once now, not re-passed on every state change.
- `public-task-content.tsx` shrank from 475 lines of mixed concerns to a thin shell.

### Inbox (`/inbox`)
This page hand-rolled its own split-pane layout with `ResizablePanelGroup` instead of going through the shared `Page` panel system — so it had no real `PanelConfig`, no header in the documented sense (just a raw `<div className="h-11">`), and none of the resize/animation/mobile handling every other panel gets for free. Migrated it onto `Page`'s `left` panel with a proper `InboxListPanelHeader`.

**Caught and fixed during browser verification:** my first pass at this introduced a "Maximum update depth exceeded" infinite loop — I'd put an unmemoized JSX literal directly into a `useEffect` dependency array (`setPanelContent` → store update → re-render → new JSX reference → effect fires again, forever). This is a documented gotcha in the `page-component` skill for a different case (`data ?? []`); I hit the JSX-literal version of the same bug, fixed it with `useMemo`, and added the case to the skill so it doesn't happen again.

### Task-mention key format
`#task` mentions in the rich-text editor showed a bare `#123` instead of the org-prefixed `SAY-123` format used everywhere else (`formatTaskKey`). Fixed by threading `orgShortId` through `MentionContext` → `useMentionTasks` → the editor → `TaskMenu`, with a graceful fallback to the old bare format at the one call site where an org object genuinely isn't in scope (`create-issue-template.tsx`).

### Also fixed
- `LLMOContent.tsx` was double-prefixing task keys: `#SAY-123` instead of `SAY-123`, because it prepended `#` to a value the caller had already run through `formatTaskKey`.

## Duplication eliminated

- **`getInitials`** — added one canonical implementation to `packages/util` and migrated ~30 call sites off two inconsistent hand-rolled versions (`.split(" ").map(...)` vs. plain `.slice(0, 2)`/`.charAt(0)`), which actually produced *different visible output* for multi-word names ("John Doe" → "JD" vs "Jo"). Now consistent everywhere: task avatars, comment avatars, org avatars, console tables, sidebars.
- **`formatDate`** — deleted 3 local reimplementations that exactly matched `@repo/util`'s existing `formatDate`, in favor of importing it. Left two alone (`release-card.tsx`, the public release detail route) because their actual output format genuinely differs (zero-padded/uppercase, long-month) — forcing those onto the shared helper would have silently changed what users see, so I documented why instead of "fixing" it.
- **Chart date-axis helpers** — `task-burndown-chart.tsx` and `task-timeline-chart.tsx` had byte-identical `formatDateKey`/`formatDateLabel` pairs; extracted into a new shared `components/charts/chart-date-utils.ts`.
- **Debounce** — this repo had four different hand-rolled debounce patterns across ~11 files. Added `hooks/useDebouncedValue.ts` as the one canonical "debounce a value" hook and migrated `useMentionUsers`, `useCommandSearch`, and a settings blocked-users search onto it. Left `user-table.tsx`/`org-table.tsx`/`task-picker.tsx` alone on deliberate judgment calls (they debounce an imperative refetch/have real abort-controller cancellation, not a plain value — converting them risked introducing race conditions for no real benefit).

## Dead code removed

- `hooks/useWebSocketSubscription.ts` + `lib/ws.ts` — fully superseded by SSE (`useServerEventsSubscription`), zero remaining references.
- `components/pages/admin/mine/task-detail.tsx` — a `@deprecated` re-export with zero consumers.
- `components/navigation-tracker.tsx` (0 bytes), `components/NavigationSpinner.tsx`, `components/dark-mode-toggle.tsx` — orphaned, no importers anywhere.
- Fixed the `teamsetttings.tsx` (triple-t) typo → `team-settings.tsx`.

**Found but deliberately not deleted:** `components/releases/status-updates/update-composer.tsx` (`UpdateComposer`) has zero importers anywhere in the app, but unlike the files above it has no deprecation marker and looks like a fully-built, unwired feature rather than leftover cruft — flagging it for you rather than guessing at intent.

## File naming/location cleanup

The repo's dominant convention (confirmed by measuring: ~82% of `.tsx` files) is kebab-case filenames with PascalCase component identifiers. A cluster of older files — mostly `components/releases/`, `components/settings/security/`, `components/shared/comments/`, and a `components/generic/` grab-bag — never got migrated. Renamed 41 files to kebab-case and fixed every import site repo-wide (verified with a final whole-repo grep for stale path references — zero remaining).

**Deliberately left alone:** `PageHeader.tsx`, `AdminCommand.tsx`, `TaskFilterDropdown.tsx`, `TaskViewDropdown.tsx` — all four are named explicitly in existing skill docs, so renaming them would mean also editing those skills; and `RenderIcon.tsx` (35 importers) in `components/generic/` — a high-blast-radius rename a background agent correctly flagged and skipped rather than risk a bad rewrite across that many files in parallel.

### `components/generic/` wasn't actually generic (follow-up round)

First pass only fixed casing; a second look at *where things live* (not just what they're named) found the real issue: `components/generic/` mixed genuinely-reusable UI primitives (`PageHeader.tsx`, `wrapper.tsx`, `page.tsx`/`use-page.tsx`, `RenderIcon.tsx`, `icon-picker.tsx`, `markdown-content.tsx`, `plan-limit-banner.tsx`, `status.tsx` — all with real multi-file usage) with four files that are actually **single-consumer app-shell singletons**, only ever mounted once from `routes/(admin)/route.tsx`: `AdminCommand.tsx`, `Context.tsx` (the root `useLayoutData()` provider, 48 importers of the *hook*, but the file itself has exactly one mount point), `GlobalCreateTaskDialog.tsx`, and `NavigationTracker.tsx`. Checked import counts for every file in the folder before touching anything, rather than assuming.

`components/admin/` already exists as a domain folder (`panels/`, `sidebars/`) — added a sibling `components/admin/shell/` and moved all four there (also kebab-cased in the same move), fixing every importer including the ~48 files that import `useLayoutData`/`RootProvider` from `Context.tsx`. Verified with a full re-check in the browser afterward since this is the highest-blast-radius change in the whole pass (`Context.tsx` is the root provider for the entire authenticated app — if this move broke, every admin page would break). Updated the `command-palette` skill's file-path reference to match.

`useAdminRoute.ts` looked like it belonged in the same bucket (0 importers by absolute-path search) but turned out to be a private relative-imported helper used only by `wrapper.tsx` — left it colocated with its one real consumer rather than moving it on a false positive.

**Checked and confirmed already-consistent (no action needed):** `components/admin/panels/`, `components/admin/sidebars/`, and the new `components/admin/shell/` all lack an `index.ts` barrel — that's the actual convention within `components/admin/*`, not an oversight, so I didn't add one just to `panels/`. `components/settings/user-settings-dialog.tsx` vs. `components/settings/security/*.tsx` looked inconsistent at a glance but is correct parent/child structure — the former is the tabbed shell dialog, the latter are sub-dialogs opened from within one of its tabs. Dialogs scattered across ~8 feature folders (`organization/`, `releases/status-updates/`, `settings/security/`, etc.) are feature-colocated by design, matching how the rest of the codebase organizes — consolidating them into one flat `components/dialogs/` folder would trade real discoverability (dialog lives next to the feature that owns it) for a shallower but less meaningful grouping, which is the over-abstraction failure mode you asked me to watch for, not a fix for it. `connections/md/github.md` looked like a stray doc file but is actual in-app content, imported via `?raw` and rendered in the connections page it sits next to — correctly colocated.

### Caught a real regression during this follow-up round

Deleting `wsPublic.ts` was the right call — same dead-code pattern as `useWebSocketSubscription.ts`/`lib/ws.ts` from the first pass (zero importers, fully superseded by SSE) — but I missed it the first time because my dead-code check only searched for absolute `@/lib/ws` imports; `wsPublic.ts` pulled in the deleted `ws.ts` via a relative `./ws` import that grep didn't catch. Found via a full `tsc` diff against a stashed clean baseline (see Verification below) and fixed by deleting `wsPublic.ts` too, once confirmed it also had zero real consumers.

## Two mistakes made and caught during this pass

Worth being upfront about, since it's exactly the kind of thing a careful review should catch:

1. While manually clearing unused-import lint warnings, I misread which identifier a Biome diagnostic's caret was pointing at twice — once removing `ChevronsUpDown` (which was in use) instead of the actually-unused `CreditCard` in `user-dropdown.tsx`, and once removing both `IconCalendarCheck`/`IconCalendarEvent` (both in use) from `release-hover-card.tsx` while chasing a different unused import in the same file. Both caught by re-grepping actual usage before moving on, and by the type-check afterward.
2. The Inbox infinite-loop bug described above, caught by loading the page in the browser rather than trusting the type-check alone (a `useEffect` dependency-array bug like this doesn't show up in TypeScript).
3. Deleted `lib/ws.ts` in the first pass based on a dead-code check that only searched for absolute-path imports, missing that `wsPublic.ts` pulled it in via a relative `./ws` import — a real breakage. Also, my first "tsc is clean" claim in this file was itself wrong, for the caching reason explained in Verification below. Both caught by redoing the type-check properly (cold, stash-diffed against the true base) rather than trusting an earlier "looks clean" result a second time.

All fixed. Take this as a signal to actually look at the diff rather than rubber-stamp it, not as a reason to distrust the whole pass — everything downstream of these spots was re-verified, and the second-round type-check (properly done this time) confirms it.

## Skills updated

- `.agents/skills/page-component/SKILL.md` — added the two new panel implementations to the reference table, and documented the unmemoized-JSX-in-a-dependency-array gotcha.

No new skills were needed — the existing `page-component`/`page-header`/`command-palette` skills already documented the right patterns; the work here was making the code actually follow them.

## Verification performed

- **`tsc --noEmit` — corrected finding.** My first pass reported "zero errors" scoped to `apps/start`, which was wrong: `apps/start` has no `check-types` script at all (confirmed — `pnpm -F start check-types` fails with "no script"), so nothing gates it in CI, and I was unknowingly relying on TypeScript's incremental `.tsbuildinfo` cache, which can under-report on a warm cache. Caught this because a later `tsc` run mid-way through the follow-up round suddenly showed 160 errors instead of 0. Redid it properly: `git stash`'d the entire branch, deleted any `.tsbuildinfo`, ran a cold `tsc --noEmit` against the true clean base (SAY-63) — **122 pre-existing errors**, unrelated to anything in this pass (unused imports, a handful of real type mismatches, all long-standing). Popped the stash, reran on the full changeset: **101 errors** — a net *improvement* of 21 (my unused-import cleanup fixed more than the file moves touched), and a file-by-file diff against the baseline confirmed exactly one genuinely new issue (the `wsPublic.ts` regression above, now fixed) — everything else in the diff was either an already-existing error now reported under a renamed file's new path, or a line-number shift from an unrelated earlier edit in the same file. This repo's pre-existing type debt (unused imports/vars scattered widely, a few real `strictNullChecks`/prop-shape mismatches) is a separate, real cleanup opportunity — flagged below, not attempted here.
- `biome check` across every touched file: cleared all unused-import/variable/fragment fallout from the renames and migrations. Left pre-existing `noExplicitAny`/`useExhaustiveDependencies`/etc. findings in files that were only touched for an import-path or one-line fix — those predate this pass and are out of scope for a structure cleanup.
- Live-clicked through: admin task detail page + its metadata panel (twice — once after the panel work, again after the high-blast-radius `Context.tsx` root-provider move, since that one could have broken every admin page if wrong), the Inbox list/detail split (including the infinite-loop bug and its fix), and a public task page (votes/status/priority/labels/release panel, comments). No console errors beyond pre-existing framework warnings unrelated to any touched file.

## Found, not fixed (pre-existing, out of scope for this pass)

- **`apps/start` has no `check-types` script at all** — the only package in this monorepo with one is `packages/ui`, so `pnpm check-types` (turbo) never actually checks the app itself, and a cold `tsc --noEmit` against the clean base branch surfaces **122 pre-existing type errors** (mostly `noUnusedLocals`/`noUnusedParameters` noise — unused imports/vars/params scattered across ~40 files — plus a smaller number of real `strictNullChecks`/prop-shape mismatches, e.g. `primary-org.tsx`'s `OrgSettingsNavEntry` type, `view-detail.tsx`'s `viewConfig` setter, a few components missing a required `permissions` prop). None of this is new — it's long-standing and simply never gated. This pass's cleanup happened to fix ~21 of them as a side effect (the unused-import work), landing at 101. Worth its own dedicated pass, and probably worth adding a real `check-types` script for `apps/start` so this stops being invisible.
- `packages/ui` has a real type-check failure independent of this branch — duplicate `@types/react` versions in the dependency tree (19.1.8 vs 19.2.8) causing ref-type mismatches across ~10 shared components (`button-group.tsx`, `calendar.tsx`, `kbd.tsx`, `skeleton.tsx`, `spinner.tsx`, etc.), plus an unrelated broken import (`@repo/components/ui/dropdown-menu`) in `user-nav.tsx`. Worth its own pass — a dependency-hygiene fix, not a structure cleanup.
- `packages/util/src/github/parse-pr-url.ts` has 2 pre-existing `strictNullChecks` violations.
- Scattered `noExplicitAny` in `github-pr-picker.tsx`, `public-comment-thread.tsx`, `public-release-discussion.tsx`, `timeline/base.tsx`, `release-field-toolbar.tsx`, and a few others — genuine type-safety debt, but each needs its own real type derived, not a mechanical fix, so left alone rather than typed around.
- Comment UI is split four ways (`components/shared/comments/`, `components/tasks/task/comment/`, `components/public/public-comment-*`, and `timeline/comment-thread.tsx`) — flagged by the audit but not consolidated, because on inspection each serves a genuinely different surface (generic primitives vs. task-specific vs. public vs. timeline-embedded) rather than being copy-pasted duplicates. Worth a closer look if you want one shared comment primitive, but not an obvious win.
- `admin/panels/task.tsx`'s header, the `taskId.tsx` breadcrumb, and the public task panel header each hand-roll their own "org avatar + task key" markup instead of reusing `GlobalTaskIdentifier` (`components/tasks/shared/identifier.tsx`) — flagged by the audit as a near-duplicate, but `GlobalTaskIdentifier` is a clickable link to a task, and all three of these are non-linking "you are already here" context labels, so forcing reuse would mean either breaking that component's contract or stripping the link behavior other callers rely on. Left alone as a case where the "duplication" is actually two different components that happen to look similar.
