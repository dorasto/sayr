---
name: public-portal
description: The public org portal (`{org}.sayr.io`, SAY-81 redesign) — route map, the `.portal` design tokens, shared `portal/ui` primitives, pure `lib/portal` logic, shared hooks and query keys, which pages use which panel, and the data constraints the design works around. Use whenever adding or changing anything under `apps/start/src/components/public/**`, `lib/portal`, `hooks/portal`, or `routes/orgs/$orgSlug/**`.
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

The public org pages are an end-user feedback portal (board, post, new post, roadmap, activity, changelog), separate from the admin app. It has its own token system, its own primitives and its own tested logic layer. The mistakes this skill prevents: using admin tokens (`bg-card`, `text-muted-foreground`) inside the portal, rebuilding a chip/tag/vote/card that already exists in `portal/ui`, putting derivation logic in a component where it can't be unit-tested, and writing a new panel when the page's layout already has a static column for it.

Design constraints that still hold: **no schema changes**, internal statuses are relabelled for end users (not remapped), SSR/SEO on `/{shortId}` is untouched, realtime (SSE) handlers are kept.

## Route map

All under `apps/start/src/routes/orgs/$orgSlug/`. Link with `to="/orgs/$orgSlug/..."` (the subdomain rewrite lives in `router.tsx`).

| Path | Route file | Screen | Panel |
|---|---|---|---|
| `/` (board) | `index.tsx` → `components/public/index.tsx` (`PublicOrgHomePage`) → `task-view.tsx` + `task-item.tsx` | Top bar with the panel toggle, tabs Active/Done/All, sort, filters, rows, "Show more posts" | **Board panel** (`public-board-panel`): overview (composer, categories, latest release) or a post (Peek) |
| `/{shortId}` | `$shortId/index.tsx` → `components/public/public-task-content.tsx` | Post page: 760px article column | `public-task-panel` (Details) |
| `/new` | `new/index.tsx` → `portal/new/NewPostPage` | New post (`?title=`, `?category=`) | none |
| `/roadmap` | `roadmap/index.tsx` → `portal/roadmap/RoadmapPage` | Status columns, "By status / By release" | none |
| `/activity` | `activity/index.tsx` → `portal/activity/ActivityPage` | Viewer's Voted / Posted (login required, `noindex`) | none |
| `/releases` | `releases/index.tsx` → `components/public/releases/releases-changelog.tsx` | Changelog; `?tab=upcoming\|released` (All = no param) | none |
| `/releases/{slug}` | `releases/$releaseSlug/index.tsx` | Release page | `public-release-detail-panel` |

`route.tsx` (layout) wraps everything in `<div className="portal flex h-dvh flex-col ...">`, renders `PublicNavigation` (64px top bar, `components/public/navigation.tsx`: org mark, Feedback/Roadmap/Changelog, Activity when logged in, search palette, Log in / avatar) and `MobileTabBar` (`portal/nav/MobileTabBar.tsx`, phones only). `isPortalPage` (a regex over the pathname: the org root, or `/{digits|new|roadmap|activity|releases}`) decides the scroll container: for portal pages the `Outlet` is rendered bare inside `#public-scroll-container` because every portal page renders its own `Page` (which owns scrolling and its panel). The `else` branch (card chrome with `bg-background`) is only the fallback for unmatched paths — a new top-level public route must be added to the regex or it gets the old card chrome. Active-nav logic is `lib/portal/nav.ts` (`getPortalSection`, `hidesMobileTabBar`) — extend it when adding a section.

## Tokens (`.portal`)

Defined in `apps/start/src/styles.css`, scoped to the `.portal` class on the layout wrapper so the admin app is unaffected, and exposed to Tailwind through `@theme inline`. Use the Tailwind class forms; never use admin/`internal` tokens inside the portal.

| Group | Classes |
|---|---|
| Surfaces | `bg-portal-canvas` (page background), `bg-portal-surface` (cards, lists), `bg-portal-raised` (recessed/hover-lifted, chips), `bg-portal-hover` |
| Lines | `border-portal-line` (hairline), `border-portal-line-2` (controls, popovers) |
| Text | `text-portal-fg`, `text-portal-fg-2`, `text-portal-fg-3` (meta; tuned for AA contrast — don't lighten) |
| Accent | `bg-portal-accent` + `text-portal-on-accent` (dark text on amber), `text-portal-accent-ink` (accent as text/icon), `bg-portal-accent-soft`, `border-portal-accent-line`, `ring-portal-focus` (focus rings; stronger than accent-line) |
| Status | `text-portal-ok` / `bg-portal-ok-soft`, `text-portal-bad` / `bg-portal-bad-soft`, `bg-portal-neutral-soft` |
| Radius | `rounded-portal-tag` 6, `-sm` 8 (small buttons), `-md` 10 (controls), `-lg` 14 (cards, lists); chips/avatars use `rounded-full` |
| Shadow | `shadow-portal-pop` (popovers/dialogs), `shadow-portal-hl` (dark-mode inset top highlight on cards) |

`--portal-accent` is `--primary`; there is no per-org accent colour.

**Dark mapping is deliberately shifted.** In dark mode the page canvas is `--sidebar` (the darkest shared tone), cards sit on `--background`, and raised/recessed areas use `--card` — one step darker/lighter than the admin convention — so cards read as lifted off the canvas. Light mode is explicit OKLCH values (canvas `0.97`, surface white). Don't "fix" this to match admin, and don't map new tokens by hand-picking values: add them to both the `.portal` and `.dark .portal` blocks plus a `--color-portal-*` line in `@theme inline`.

**Popovers, dialogs and drawers render in a portal outside `.portal`**, so the tokens don't resolve inside them. Add `className="portal ..."` on the popup content itself (see `PortalSearch.tsx`, `board/BoardToolbar.tsx`, `new/KindChips.tsx`, `new/PostEditorToolbar.tsx`). Forgetting it renders them transparent/unstyled with no error.

`styles.css` also holds a `prefers-reduced-motion` block scoped to `.portal` (no pulses, no popup animations, no transitions). New animation should be happy being switched off by it.

## Shared primitives (`components/public/portal/ui/`)

Reuse before building. All are token-styled and live in this directory:

| Primitive | Use |
|---|---|
| `StatusChip` | Open / Planned / In progress / Done / Won't do pill (takes the raw status; maps via `lib/portal/status`) |
| `CategoryTag`, `LabelTag`, `ReleaseTag` | Read-only category / label / release references |
| `Pill` | Byline pills: `variant` Author / Team / `gh` (neutral, e.g. "via GitHub", versions) |
| `PortalAvatar` | Avatar with initials fallback; `ring` marks team members |
| `VoteBox` | Row upvote toggle (stops click so it doesn't open the row) |
| `VoteButton` | Full-width "Upvote" / "You upvoted" (post page, Peek, drawer) |
| `PortalButton`, `portalButtonVariants` | Portal button (`default`/`primary`/`ghost` × `sm`/`md`/`lg`); use the variants fn directly on a `<Link>`. 44px min height on phones |
| `PortalTabs` | Underline tabs on the shared cossui `Tabs`; tab strip only, caller swaps content |
| `ListContainer`, `ListRow` | Radius-14 bordered list shell and its rows (hover/selected styles) |
| `PortalCard`, `PortalCardTitle` | Surface card and 13px card heading |
| `EmptyState` | Centered icon/title/description/actions |
| `RowSkeleton`, `RowSkeletonList` | Loading rows |
| `Stepper` | Open → Planned → In progress → Done path |
| `SegmentedProgress`, `BarRow` | Release progress bar and "What it touches" rows |

Still reuse what already exists elsewhere instead of re-implementing: `Avatar`/`getInitials`/`ensureCdnUrl`, `Skeleton`, `headlessToast`, `RenderIcon`, `formatTaskKey`/`formatCount`/`formatDate*` from `@repo/util`, the ProseKit `Editor` (read-only) for rich text. Login prompts use `LoginDialog` (`components/auth/login`) as a trigger wrapper; there is no `LoginPopover`.

Screen-specific pieces sit in sibling folders: `board/`, `post/`, `peek/`, `new/`, `releases/`, `roadmap/`, `activity/`, `search/`, `nav/`. Release-specific bits such as `HealthPill` live in `releases/`.

## Pure logic (`lib/portal/`)

Derivation logic goes here, not in components. Each module has a `*.test.ts` beside it. **Imports inside `lib/portal` are relative (`./time`) and there are no `@/` imports at all**: `apps/start/vitest.config.ts` has no `@/` alias and no jsdom, so tests only run on pure modules. Run with `pnpm -F start test`.

| Module | What it does |
|---|---|
| `status.ts` | Relabel (`backlog`→Open, `todo`→Planned, `in-progress`→In progress, `done`→Done, `canceled`→Won't do), `getStepperIndex`, `isVotingClosed` (canceled only), `isShipped` (done + release `released`), `getReleaseDate` |
| `board-filters.ts` | Tabs (`active`/`done`/`all`), `matchesTab`, `filterBoardTasks`, `countByTab`, `sortBoardTasks` (incl. client-side "updated") |
| `board-row.ts` | Row date/name formatting, `pickLatestRelease`, `parseCsvParam` |
| `excerpt.ts` | `buildExcerpt`: wraps `extractTaskText` after skipping headings/code/images and issue-template prompt lines |
| `duplicates.ts` | Duplicate-title scorer (stoplist, min length, limit 3) |
| `related.ts` | `findRelatedPosts` (category/label overlap) |
| `latest-update.ts` | `getLatestUpdate`: newest team comment for the "Latest update" card |
| `team.ts` | `isTeamMember`, `findTeamMemberUser` over `organization.members[].user.id` |
| `task-keys.ts` | `linkifyTaskKeys`: turns `SAY-69` text into link segments using the org prefix |
| `github-issue.ts` | `parseGithubIssueUrl` → `{repo, number}` |
| `peek.ts` | Peek helpers: `PEEK_DESKTOP_QUERY` (`>=1024px`), `normalizeShortId`, `shouldInterceptRowClick`, `buildPostUrl`, `mapPublicTask` |
| `board-panel.ts` | Board panel decisions: `getUrlSyncAction` (what `?task` / the viewport asks of the panel: show post, show overview, redirect below 1024px, clear on narrowing) and `getRowClickAction` (select / deselect / follow link) |
| `new-post.ts` | Category chip split, sessionStorage draft (de)serialisation, `mergeSimilarPosts` |
| `search.ts` | Palette: query normalisation, scoring, highlight splitting, merge/rank, keyboard shortcut rules |
| `changelog.ts`, `release-notes.ts`, `release-page.ts`, `release-progress.ts` | Changelog tabs/ordering and display date; release-notes markdown parsing (+ task-key linkify); health pill, task ordering, lede/notes split; progress segments and label counts |
| `roadmap.ts` | Status/release columns, "recently shipped" window (`ROADMAP_RECENT_DAYS` = 90) |
| `activity.ts` | Voted/Posted resolution, "Shipped because you asked", vote-status bar rows |
| `nav.ts`, `time.ts` | Active nav section / mobile-bar rules; date coercion helpers |

## Hooks and query keys

`apps/start/src/hooks/portal/`:

- `useVote` — the one optimistic vote toggle (replaced the old inline copies). Updates the shared votes cache and the count, reconciles with the server, rolls back with a toast. `components/public/portal/board/useBoardVote.ts` wraps it for rows and also writes the count back into the cached board list.
- `usePublicVotes` — the viewer's votes (`GET .../task/voted`); `publicVotesKey(orgId)` and `fetchPublicVotes` exported.
- `useBoardList` — paginated board list; exports `BOARD_PAGE_SIZE` (30), `boardListKey`, and `updateBoardTasks` (patch every cached variant without refetching; return the same reference for untouched tasks).
- `useRoadmap`, `useActivity` — page-loaded post sets (see constraints), with their realtime wiring.
- `usePortalSearch`, `useSimilarPosts`, `useSearchShortcut` — palette data, duplicate suggestions, Cmd/Ctrl+K and `/`.
- `usePanelViewportDefaults(panelId)` — the post, release and board panels: modal and closed-on-load below 1024px.

Also `components/public/portal/board/useBoardSideData.ts`: `useBoardCounts` (`boardCountsKey`) and `useBoardReleases` (`boardReleasesKey`, first 50 releases, `releasesById`). Post comments: `post/usePostComments.ts` (`publicCommentsKey`). Peek's fetched-post fallback: `peek/usePeekPost.ts` (`patchPeekPosts`).

**Query-key conventions**: every board/post list query lives under the prefix `["org-tasks", orgId, ...]` (full key `[..., "open"|"closed", sortBy, categoryId|"all"]`) so SSE handlers invalidate/patch by prefix — use `boardListKey(orgId)` and `updateBoardTasks`, don't hand-write the key. Votes are `["votes", orgId]` (`publicVotesKey`) and must not be forked. Roadmap and Activity read the same `org-tasks` cache, so a board visit pre-warms them. Search/duplicate queries use `["portal-search", ...]` / `["portal-similar-*", ...]`.

## Panels

Panel mechanics are in the `page-component` skill; this is which public screen uses which.

| Panel | Where | Notes |
|---|---|---|
| `public-board-panel` (`PUBLIC_BOARD_PANEL_ID`, `portal/board/constants.ts`) | Board | The board's one right panel, `defaultOpen: true`, persisted open/closed and resized width, `width: "380px"`, min 280 / max 720, phone sheet `height: "70dvh"`. Shows the **overview** (`BoardRailPanel`: composer, "Browse by category", "Latest release") by default, and swaps to the selected **post** (Peek) while `?task=<shortId>` is set. Peek is desktop (>=1024px) only; narrower viewports navigate rows to `/{shortId}` and use the panel as a modal sheet (`usePanelViewportDefaults`: closed on load, opened by the top-bar toggle or the "Share an idea or report a bug" button). While a post is selected rows go compact. Pattern: see "Board panel" in `page-component` |
| `public-task-panel` (`PUBLIC_TASK_PANEL_ID`) | `/{shortId}` | "Details" drawer, `defaultOpen: true`, 380px: Vote card, Details, Related posts (`components/public/panels/task.tsx`, reads `usePublicTask()` context) |
| `public-release-detail-panel` | `/releases/{slug}` | Progress, What it touches, Details; `defaultOpen: true`, 380px (`portal/releases/ReleaseDetailPanel.tsx`) |

The board has no static right column any more: the composer, categories and latest release are the panel's overview view. The composer's draft (`useComposerDraft`) and the data the overview reads (`useBoardRail`) live in `BoardRailProvider` (`portal/board/`), not in the panel content, because panel content unmounts when it swaps to a post or the panel closes. Don't move state into `BoardRailContent`.

**Not panels** (static page columns inside the page content): the roadmap's footer card and the activity rail (`activity/ActivityRail.tsx`). `/roadmap` and `/activity` render a bare `<Page>` with no `panels`. Don't convert these into drawers.

## Decisions

- **Anonymous voting stays.** Votes are never login-gated (`useVote` doesn't read the session); the login prompt is only for commenting, posting and reactions.
- Voting is closed on `canceled` posts only (`isVotingClosed`).
- `canceled` ("Won't do") posts appear only under the **All** tab and only when the status filter explicitly includes them.
- The Activity page has Voted and Posted tabs only — **no Commented tab** (no endpoint for "my comments").
- **No org accent colour** and no org website/GitHub link buttons in the page head (no such org fields; adding them was out of scope).
- **No schema changes** and no new endpoints for the portal.
- Rows use Peek by default on desktop; modified clicks (cmd/ctrl/shift/alt/middle) fall through to the link.
- Closing behaviour of the board panel: the post header's X returns to the overview (panel stays open, `?task` cleared); the overview header's X, Esc, drag-dismiss and the top-bar toggle close the whole panel (and clear `?task` if a post was showing). Esc closes the panel from anywhere on the page, in either view — that is Base UI's non-modal Drawer behaviour, shared with the post page's Details drawer.

## Data constraints the design works around

- The internal list endpoint (`GET /api/internal/v1/admin/organization/task/tasks`) caps `limit` at **30**, has **no `status` or `labels` params**, supports `sortBy` = `newest|trending|mostPopular`, `category_id`, `q` (title+description, works for logged-out viewers) and `include_closed=true` (done + canceled). So status/label filters and the "updated" sort run **client-side over the loaded set**; the board keeps fetching a bounded number of pages (`MAX_AUTO_PAGES` in `components/public/index.tsx`) until enough rows are visible, then offers "Show more posts". Roadmap and Activity load pages up to a cap (`ROADMAP_INITIAL_PAGES`, `ACTIVITY_INITIAL_PAGES`) and offer "Show more"/"Load more".
- Counts come from `GET .../task/tasks/counts?org_id=` → `{open, categories:[{id,count}]}` (open public posts only): exact for the Active tab and the categories card. Done/All counts are only shown once every page of that query is loaded.
- Duplicate matching combines the client scorer over loaded posts with server `q` search (works for guests; don't use `/task/search`, which needs a login).
- **Team resolution** uses the layout loader's `organization.members[].user.id` (seat-assigned) via `lib/portal/team.ts` — Team pill, ringed avatars, Latest update.
- **Release lead**: the public releases API doesn't resolve `leadId`, so it's looked up against `organization.members` and hidden when not found.
- Releases come from the public v1 API (`/api/public/v1/organization/{slug}/releases`): statuses `planned|in-progress|released|archived`; archived releases are hidden from the changelog and release tags.
- Votes: `POST .../task/create-vote` → `{taskId, voted, voteCount}`; works anonymously.

## Rules

1. Search `portal/ui` and `lib/portal` before adding a component or helper; add new shared pieces there, with a test beside any new `lib/portal` module.
2. Portal-only styling uses `portal-*` tokens; add popup content `className="portal ..."`.
3. Task identifiers shown to users are `formatTaskKey(orgShortId, shortId)` — never a bare `shortId` or a `#` prefix (route params still use the raw number).
4. Wire panel content as stable constants / memoised JSX (see `page-component` Gotchas), and gate `setPanelContent` on `panel.isRegistered`.
5. A new top-level public route must be added to the `isPortalPage` regex in `route.tsx` and to `lib/portal/nav.ts` if it is a nav section.
6. Public-facing changes involving cookies, OAuth providers, account data or draft storage may need a `/legal` update — the new-post draft uses `sessionStorage` only.
