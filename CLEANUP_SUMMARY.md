# apps/start cleanup — `global-cleanup` branch

Branched off `SAY-63`. Committed in stages on this branch (`git log global-cleanup` for the individual commits) — nothing pushed. This file covers two rounds of work:

- **Round 1**: structure/naming cleanup, dead code, first duplication pass, panel architecture.
- **Round 2**: a full functional audit — every route, every task-related component's real usage, cross-surface feature parity, and a second duplication pass — after you flagged that the first pass covered naming but not "does everything actually work and stay consistent."

Both rounds used a fleet of parallel research agents for the audits, then either dedicated worker agents or direct edits for the fixes, verified with `tsc --noEmit` (diffed against a clean-baseline stash, not just trusted at face value — see the note under Verification), `biome check`, and live browser testing against the running dev server for every risky change.

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

---

# Round 2 — full functional audit

You pushed back: "does every path and route make sense... are all task related components regularly used... does every path work." Round 1 covered naming and location; it didn't verify actual behavior. This round used four parallel agents (full route inventory, task-component usage tracing, cross-surface feature-parity comparison, a second duplication pass) covering every route file, every file under `components/tasks/**`, and every surface that renders a task list or task detail. Then I fixed what the audit found, verifying each fix live in the browser, not just via `tsc`.

## Real bugs found and fixed

1. **Vote counts silently never live-updated on the main org Tasks list.** Backend-confirmed: `apps/backend/routes/api/internal/v1/task.ts`'s vote-broadcast only sent `UPDATE_TASK_VOTE` to the task-specific SSE room (`task:{taskId}`), never to the org's general `tasks` room — every other broadcast type in that file (`CREATE_TASK`, `UPDATE_TASK`, etc.) correctly targets both via a combined-room call. `/mine`, `/inbox`, and the public board all worked because they receive votes via a different (individual-client) fallback path; the main authenticated Tasks list — arguably the single most-used view in the app — did not. Also removed a stray `client.orgId !== orgId` condition present nowhere else in the file that would have excluded same-org clients from that fallback path too. Fixed the backend broadcast and added the missing frontend handler; verified live in the browser that the page correctly subscribes to the `tasks` SSE channel this fix now actually reaches.
2. **Public task page built its org subdomain URL from a lowercased/regex'd `org.name`** (`https://${org.name.toLowerCase().replace(/\s+/g,"-")}.sayr.io/...`) instead of the real, already-correct `org.slug` — for any org whose slug doesn't match a naive name-slugification (special characters, manual slug edits, renamed orgs), this produced a broken URL in the page's JSON-LD structured data, OG metadata, and LLMO content block. Also hardcoded `.sayr.io` instead of `VITE_ROOT_DOMAIN` like every other org-URL construction in the codebase. Root cause: the loader's `org` object simply never included `slug` in the first place. Fixed by threading it through.
3. **Admin single-task route had no NaN guard** on `parseInt(params.taskShortId)`, unlike its public equivalent (`/orgs/$orgSlug/$shortId`) which already redirects on invalid input — an admin visiting a garbage URL like `/$orgId/tasks/abc` would silently pass `NaN` through to the server function instead of getting redirected. Added the matching guard.
4. **`TaskDetailCompact`** (the component behind the Inbox task pane and the "click a task in any list" dialog) **was missing editable parent/subtask/relations management and the integrations tile**, despite matching the full admin task page on every other feature (toolbar, AI insights, full timeline, even a hand-rolled workaround so relations *display* correctly). `TaskContextBanner` only showed relations read-only — there was no way to actually set a parent, add a subtask, or link a related task from Inbox or a list-click dialog. This reads as a gap from the panel-restructuring work, not a deliberate cut (no comment anywhere explaining it, unlike the public page's genuinely-documented scope cuts). Ported the three hierarchy sections and the integrations tile in; confirmed live in the browser that "Set parent"/"Add subtask"/"Add relation" now render correctly in the Inbox panel.
5. **`release-slug.tsx`'s charts panel header was a bare `"Information"` label** that didn't even match its own content (progress charts, task stats, target date) — no icon, no release name, no action, standing out against every sibling panel header in the app. Replaced with a real identity header (release icon + name), matching the pattern every other panel already uses.

## Dead code (confirmed by two independent audits, zero real importers each)

- `components/pages/admin/mine/task-list.tsx` + `mine/tasks/{index.ts,task-item.tsx,task-empty-state.tsx,task-sort-config.ts}` — a full legacy "My Tasks" list implementation, fully superseded by `UnifiedTaskView`, never deleted when that migration happened.
- `components/tasks/task/comment/edit.tsx` — comment editing now lives inline in `timeline/timeline-comment.tsx`; this was the leftover pre-consolidation version.
- `components/tasks/task/comment/index.tsx` — a barrel every real consumer already bypassed by importing `./new` directly.

## Duplication (second pass — what round 1 missed)

- Migrated inline slug-sanitizer regexes (3 spots across `create-organization-dialog.tsx`, `create-release.tsx`, `create-release-dialog.tsx` ×2) onto the existing `generateSlug` from `@repo/util` — but only where behaviorally safe. Left the three *directly-typed* slug input fields alone with an in-file comment explaining why: `generateSlug` strips trailing hyphens and converts `.`/`_` to hyphens, both of which would fight a user mid-keystroke or mangle a version-style slug like `v1.0.0`.
- `formatTokenCount` was defined identically in both `console/org-table.tsx` and `console/org-ai-usage.tsx` — extracted into a shared `console/format-token-count.ts`.
- `routes/api/og.tsx` hand-maintained its own status color/label/order tables, with a comment on them literally saying "must stay in sync with statusConfig" — now derives them from the real `statusConfig` instead of hand-copying it.
- `components/tasks/shared/index.tsx`'s barrel had gone stale: 5 files added over time (`task-field-toolbar`, `task-field-toolbar-types`, `integration-registry`, `nested-grouping`, `visibility`) were never added to it, forcing 9 consumer files into deep imports instead of the barrel every sibling field-picker already gets. Backfilled the barrel and migrated all 9 consumers onto it.

## What the audit found but I deliberately did not change

- **Comment count shown on the public task list but nowhere on the internal authenticated lists.** Real gap, but the public list gets it by eagerly loading each task's full `comments` array client-side and counting — not something to replicate on the main org Tasks list without a proper backend aggregate-count query, which is a performance-sensitive change I didn't want to rush. Needs its own pass with a real `_count`-style query.
- **Public board has zero comment-moderation capability** (an org admin viewing the public page can't delete or hide someone else's comment, even though the identical comment is fully moderatable from the internal task page). Real, and probably the most user-facing gap left — but it's a permission-surface change, and I'd rather flag it precisely than guess at the right authorization check under time pressure.
- **Redundant duplicate `UPDATE_TASK` SSE handler** registered both by `UnifiedTaskView` itself and by every host page that embeds it — currently harmless (idempotent), flagged as a future maintenance trap (if one is ever changed without the other, behavior silently diverges), not touched because understanding every `UnifiedTaskView` consumer well enough to safely remove one copy is more risk than the current zero-impact duplication justifies.
- **Route param naming**: the admin single-task route uses `$taskShortId`, the public equivalent uses `$shortId` for the same concept. Doesn't affect the actual URL (TanStack Router param names aren't part of the path shape here), so it's cosmetic/internal — flagged, not renamed, since it'd mean renaming a route folder for limited benefit.
- **Two more hand-rolled raw-`Command` comboboxes** beyond the three already known (`prosekit/ui/code-block-view-inner.tsx`'s language picker, `view-filter-editor.tsx`'s multi-level filter builder) — the first is a genuinely low-risk merge candidate onto the shared `ComboBox*` primitive, the second is structurally more complex (multi-level nav) and would need a new combobox variant. Neither touched this round; flagging so a future pass doesn't add a sixth.
- **Prop-naming drift** across the field-picker family: `onChange` means a plain callback on most pickers but a namespaced per-field object on `TaskFieldToolbar`; the two multi-select pickers (`assignee`/`label`) don't agree on a callback name (`onChange` vs `onLabelsChange`); organization is passed as a full object in one place, an id-only string in others, and both simultaneously (as two different optional props) in a third. Real inconsistency, but a naming-only change across a dozen call sites for zero functional benefit — lower priority than everything above.

## Verification performed (round 2)

- All four audit agents' claims were independently re-verified (import counts re-grepped, file contents re-read) before I acted on them, not taken at face value.
- `tsc --noEmit`, diffed against the 101-error baseline established in round 1: stable at 101 after every fix in this round — zero new errors introduced, confirmed after each individual change, not just at the end.
- Backend fix verified by reading the actual `sseBroadcastToRoom` implementation (not assumed) to confirm the combined-room channel syntax (`"tasks;task:${taskId}"`) and the `includeParent` flag both behave as intended, and cross-checking against the already-correct `UPDATE_TASK` broadcast earlier in the same file.
- Backend type-checked separately (`bunx tsc --noEmit` in `apps/backend`) — 14 pre-existing errors, all in `packages/database`/`packages/util`, none touching the edited function.
- Live-verified in the browser: Inbox panel (new "Set parent"/"Add subtask"/"Add relation" sections render and the page's console is clean), org Tasks list page (loads correctly, confirmed via network logs that it's subscribed to exactly the SSE channel the vote-broadcast fix now reaches).
