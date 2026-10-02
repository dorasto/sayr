---
name: public-portal
description: The public org portal (`{org}.sayr.io`, SAY-81 redesign) — route map, the `.portal` design tokens, shared `portal/ui` primitives, pure `lib/portal` logic, shared hooks and query keys, which pages use which panel, and the data constraints the design works around. Use whenever adding or changing anything under `apps/start/src/components/public/**`, `lib/portal`, `hooks/portal`, or `routes/orgs/$orgSlug/**`.
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

The public org pages are an end-user feedback portal (board, post, new post, roadmap, activity, changelog), separate from the admin app. It has its own token system, its own primitives and its own tested logic layer. The mistakes this skill prevents: using admin tokens (`bg-card`, `text-muted-foreground`) inside the portal, rebuilding a chip/tag/vote/card that already exists in `portal/ui`, putting derivation logic in a component where it can't be unit-tested, and writing a new panel when the page's layout already has a static column for it.

**The Feedback board and the Roadmap are not portal-only UI any more: they render through the admin board system** (`apps/start/src/components/board/`, see the `board` skill) as read-only, `portal`-themed `BoardProvider`s. The page keeps data fetching, tabs/sort/filters, loading/error/empty states and panels; the board owns how the posts are laid out. Fix a layout/column problem in the board or in the provider config below, don't rebuild a portal-only list/column.

Design constraints that still hold: **no schema changes**, internal statuses are relabelled for end users (not remapped), SSR/SEO on `/{shortId}` is untouched, realtime (SSE) handlers are kept.

## Route map

All under `apps/start/src/routes/orgs/$orgSlug/`. Link with `to="/orgs/$orgSlug/..."` (the subdomain rewrite lives in `router.tsx`).

| Path | Route file | Screen | Panel |
|---|---|---|---|
| `/` (board) | `index.tsx` → `components/public/index.tsx` (`PublicOrgHomePage`) → `task-view.tsx` (hosts the shared `<Board />`; list rows reuse `task-item.tsx`) | Top bar (`BoardPageBar`) holding the tabs Active/Done/All on the left and sort, filters and the panel toggle on the right; posts as a **list only**, "Show more posts" | **Board panel** (`public-board-panel`): overview ("Share an idea" card, categories, latest release) or a post (Peek) |
| `/{shortId}` | `$shortId/index.tsx` → `components/public/public-task-content.tsx` | Post page: 760px article column | `public-task-panel` (Details) |
| `/new` | `new/index.tsx` → `portal/new/NewPostPage` | New post (`?title=`, `?category=`) — the **only** way to post (see "New post form") | none |
| `/roadmap` | `roadmap/index.tsx` → `portal/roadmap/RoadmapPage` → `roadmap-board.tsx` (shared board kanban) | Status columns, "By status / By release" | none |
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

**Popovers, dialogs and drawers render in a portal outside `.portal`**, so the tokens don't resolve inside them. Add `className="portal ..."` on the popup content itself (see `PortalSearch.tsx`, `board/BoardToolbar.tsx` — its menus now sit in the page bar — `new/KindChips.tsx`, `new/PostEditorToolbar.tsx`). Forgetting it renders them transparent/unstyled with no error.

**The shared board is re-themed by one extra block, not by portal classes.** `styles.css` has `.portal [data-board-theme="portal"] { --background/--card → --portal-surface; --muted/--secondary → --portal-raised; --accent → --portal-hover; --border → --portal-line; --foreground → --portal-fg; --muted-foreground → --portal-fg-3; --ring → --portal-focus … }`. `<Board />` renders a `data-board-theme` root from `BoardProvider theme="portal"`, so the board's admin utilities (`bg-card`, `border-border`, `grid-board.tsx`'s hard-coded classes) resolve to portal values inside it. Board code stays admin-token; **portal renderers you pass in (`PublicBoardRow`, `RoadmapCard`) use `portal-*` classes as usual**. Don't add `portal-*` classes to board components and don't theme the board by wrapping it in extra overrides — extend that block if a token is missing. Dark mode needs nothing extra (the `--portal-*` values it points at already shift in `.dark .portal`). The board is read-only here, so it opens no portalled popovers that would need `className="portal"`.

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
| `PortalTabs` | Underline tabs on the shared cossui `Tabs`; tab strip only, caller swaps content. `fill` mode sits in a bar (full bar height, bar border = underline, scrolls sideways) |
| `ListContainer`, `ListRow` | Radius-14 bordered list shell and its rows (hover/selected styles) |
| `PortalCard`, `PortalCardTitle` | Surface card and 13px card heading |
| `EmptyState` | Centered icon/title/description/actions |
| `RowSkeleton`, `RowSkeletonList` | Loading rows |
| `Stepper` | Open → Planned → In progress → Done path |
| `SegmentedProgress`, `BarRow` | Release progress bar and "What it touches" rows |

Still reuse what already exists elsewhere instead of re-implementing: `Avatar`/`getInitials`/`ensureCdnUrl`, `Skeleton`, `headlessToast`, `RenderIcon`, `formatTaskKey`/`formatCount`/`formatDate*` from `@repo/util`, the ProseKit `Editor` (read-only) for rich text. Login prompts use `LoginDialog` (`components/auth/login`) as a trigger wrapper; there is no `LoginPopover`.

Screen-specific pieces sit in sibling folders: `board/`, `post/`, `peek/`, `new/`, `releases/`, `roadmap/`, `activity/`, `search/`, `nav/`. `ListContainer` is also the board's `renderers.listContainer` on the Feedback list. Release-specific bits such as `HealthPill` live in `releases/`.

## Feedback and Roadmap on the shared board

Both mount `BoardProvider` with `capabilities={READ_ONLY_CAPABILITIES}`, `theme="portal"`, a **`controlled`** scope and module-level (stable) `views`/`renderers`. Never edit, select, drag, bulk-edit or save views here. Read the `board` and `board-saved-views` skills for the contracts; this is how the portal uses them.

### Feedback (`components/public/task-view.tsx`, `portal/board/`)

- **Page owns the controller.** `PublicOrgHomePage` keeps `useBoardList`, realtime, counts, tab/sort/filter state, `filterBoardTasks`/`sortBoardTasks` and the `?tab`/`?sort`/`?status`/`?labels`/`?category` params. `BoardToolbar.tsx` (`BoardTabs`, `BoardToolbarControls`: tabs, sort, filter menus) stays the controller UI, but it is rendered in the **Page `header`** (`BoardPageBar`), not in the content column; the board never filters or sorts. `PublicTaskView` builds a `BoardDataSource` from the *already visible, already ordered* posts with **`passthrough: true`**, `pagination {hasMore, isFetchingMore, loadMore, loadMoreLabel: "Show more posts"}`, the org's `labels`/`categories` and empty `releases` (public releases are summaries, not `releaseType` rows).
- **List only**: the public Feedback board has no layout switch and no `?layout` param (it is deliberately not `?view`, the admin saved-view pointer). Layout follows the admin pages: the site header, the board's page bar (`px-3`) and any side panel run the full available width, and only the page body is nested — `PORTAL_BODY` in `portal/ui/column.ts` (`mx-auto max-w-[1120px] px-4 md:px-6`), used by the board, roadmap, activity and changelog bodies; it centres in the space the panel leaves. Don't add another `max-w`/gutter wrapper around header or bar, and don't wrap the whole layout in a max-width (that's what the post article and new-post form set for themselves). The admin card view (`CARD_VIEW`/`BoardCardView`) still exists in `components/board` but the public board does not register or render it.
- **Page bar** (`portal/board/BoardPageBar.tsx`, the `Page` `header`; h-11 desktop, h-14 phones): tabs on the left (`PortalTabs fill` — the bar's own `border-b` is the underline track; the strip scrolls sideways instead of overflowing when narrow), then sort and filter menus (icon-only 44px buttons on phones, `BoardToolbarControls`), then the panel toggle. No org name, no page head. `PublicOrgHomePage` builds `toolbar` (a `BoardToolbarProps`) on every render and passes `<BoardPageBar toolbar={toolbar} />` as `header` — don't hoist it into a module constant or `useMemo` with a partial dependency list, or tab/sort/filter/count changes go stale. `PublicTaskView` only gets `tab` and `onShowAll` for its empty / no-results states.
- **`public-board-config.tsx`** holds every provider input as module constants: `PUBLIC_BOARD_CAPABILITIES` (read-only), `PUBLIC_BOARD_VIEWS` (`[PUBLIC_LIST_VIEW]`; the list is `LIST_VIEW` with `BoardListView flatSubtasks`, `drag: false`, `subtasks: "flat"`, so server-ranked posts are never nested), `PUBLIC_BOARD_RENDERERS` (`row: PublicBoardRow`, `listContainer: ListContainer`, `footer: ShowMorePosts`), and `PUBLIC_BOARD_SCOPE` — one `controlled` scope (grouping `none` via `pageLocalGrouping`, `showCompletedTasks: true`, no sort, `viewMode: "list"`); the controlled `onChange` is ignored.
- **Renderers** (they only receive `{task}`, so shared page data travels in `PublicPostsContext` — `releasesById` — plus `usePublicPostProps(task)`, which resolves categories, release, the Peek `onOpen` and `selected` for one post): `PublicBoardRow` (wraps the existing `PublicTaskItem`). Rows never change shape when a post is open in the Peek panel — only the open one is marked `selected` (the Activity page's `compact` rows are separate). Click → `usePeek().openPost` as before; anonymous voting still goes through `useBoardVote`/`useVote`.
- **Footer**: `ShowMorePosts` is the `renderers.footer`; `BoardFooter` mounts it only while `pagination.hasMore`.
- **Stays page-level** (not `renderers.states`): skeleton (`RowSkeletonList`), error (`BoardErrorState`), and the empty/no-active/no-results states, all rendered by `PublicTaskView` instead of `<Board />`. The page also renders `<BoardFooter />` itself under the skeleton/empty states so "Show more posts" stays reachable when filters hide everything while more pages exist. `BoardPanelProvider` / `?task` / Peek / the overview rail are unchanged and sit outside the board.

### Roadmap (`portal/roadmap/`)

- `RoadmapPage` keeps `useRoadmap` (paging, realtime), the heading, the `By status` / `By release` segmented control (local state), the loading skeleton (`RoadmapColumnSkeleton`, the only thing left in `RoadmapColumn.tsx`), `RoadmapErrorState` and the "browse open posts" `BoardLinkCard`. Once loaded it renders `RoadmapBoard` (`roadmap-board.tsx`).
- `RoadmapBoard` is a read-only `BoardProvider` with **one view**: `KANBAN_VIEW` re-pointed at `<BoardKanbanView pageScroll />` (the page scrolls as a whole and gives the board no bounded height). `renderers = {card: RoadmapBoardCard (wraps the existing RoadmapCard), footer: RoadmapFooter}`. The "By release" columns already name the release, so the card's release tag is hidden there (`RoadmapCardContext.showReleaseTag`). The scope is `controlled`, rebuilt (memoised) per view with the matching page-local grouping, `viewMode: "kanban"`.
- `roadmap-groupings.tsx` — `createRoadmapGroupings(releasesById)` returns two `BoardGroupingDefinition`s, `roadmap-status` and `roadmap-release`, passed as `BoardProvider groupings` (memoised on `releasesById`). Both are `persistable: false`, `canSubGroup: false`, **`ownsMembership`** (the roadmap decides which posts appear and their order, so the board skips its completed filter and sort), **`keepEmptyColumns`** (an empty "Planned" still shows its message), and have no `getDropPatch`. The column `header` is a `StatusChip` or the release link chip (`ReleaseColumnTitle`); `description`/`emptyMessage` come from the columns.
- `lib/portal/roadmap-columns.ts` is the pure core: `toBoardColumns(mode, items, releasesById, now)` (`"status" | "release"`) built on `buildStatusColumns`/`buildReleaseColumns` in `lib/portal/roadmap.ts`, with an injected `now` (tests cover the 90-day rule). It imports the `BoardColumn` type from the board relatively.
- **Paging**: `useRoadmap`'s `capped`/`showMore`/`isFetchingMore` map to `pagination {hasMore: capped, …, loadMoreLabel: "Show more"}`; because `hasMore` is true, kanban column counts with a custom header show a trailing "+" (lower bound).

## Pure logic (`lib/portal/`)

Derivation logic goes here, not in components. Each module has a `*.test.ts` beside it. **Imports inside `lib/portal` are relative (`./time`) and there are no `@/` imports at all** (a relative type-only import of a board type, as `roadmap-columns.ts` does, is fine): `apps/start/vitest.config.ts` has no `@/` alias and no jsdom, so tests only run on pure modules. Run with `pnpm -F start test`.

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
| `new-post.ts` | Category chip split, `POST_PRIORITIES`/`isPostPriority`, sessionStorage draft (title, details, kind, priority, labels, template) (de)serialisation, `mergeSimilarPosts` |
| `search.ts` | Palette: query normalisation, scoring, highlight splitting, merge/rank, keyboard shortcut rules |
| `changelog.ts`, `release-notes.ts`, `release-page.ts`, `release-progress.ts` | Changelog tabs/ordering and display date; release-notes markdown parsing (+ task-key linkify); health pill, task ordering, lede/notes split; progress segments and label counts |
| `roadmap.ts` | Status/release columns, "recently shipped" window (`ROADMAP_RECENT_DAYS` = 90) |
| `roadmap-columns.ts` | `toBoardColumns(mode, items, releasesById, now)`: the roadmap columns as the board's `BoardColumn`s (descriptions, empty messages, `describeReleaseColumn`, `isUnscheduledColumnId`) over `roadmap.ts`; the only `lib/portal` module that imports from `components/board` (a relative, type-only import) |
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
| `public-board-panel` (`PUBLIC_BOARD_PANEL_ID`, `portal/board/constants.ts`) | Board | The board's one right panel, `defaultOpen: true`, persisted open/closed and resized width, `width: "380px"`, min 280 / max 720, phone sheet `height: "70dvh"`. Shows the **overview** (`BoardRailPanel`: the "Share an idea or report a bug" card, "Browse by category", "Latest release") by default, and swaps to the selected **post** (Peek) while `?task=<shortId>` is set. Peek is desktop (>=1024px) only; narrower viewports navigate rows to `/{shortId}` and use the panel as a modal sheet (`usePanelViewportDefaults`: closed on load, opened by the top-bar toggle; the "Share an idea or report a bug" button on the board links straight to `/new`). The open post's row is marked selected; rows keep their layout. Pattern: see "Board panel" in `page-component` |
| `public-task-panel` (`PUBLIC_TASK_PANEL_ID`) | `/{shortId}` | "Details" drawer, `defaultOpen: true`, 380px: Vote card, Details, Related posts (`components/public/panels/task.tsx`, reads `usePublicTask()` context) |
| `public-release-detail-panel` | `/releases/{slug}` | Progress, What it touches, Details; `defaultOpen: true`, 380px (`portal/releases/ReleaseDetailPanel.tsx`) |

The board has no static right column any more: the "Share an idea or report a bug" card, categories and latest release are the panel's overview view. The card (`ShareIdeaCard` in `BoardRailCards.tsx`) is just a link to the full form via `newPostLink`, shown only when `usePublicPostAbility().canPost`; there is no quick composer on the board (it was removed so templates, priority and labels have one home). The data the overview reads (`useBoardRail`) lives in `BoardRailProvider` (`portal/board/`), not in the panel content, because panel content unmounts when it swaps to a post or the panel closes. Don't move state into `BoardRailContent`.

### New post form (`/new`)

`portal/new/NewPostPage.tsx` is the single creator and has parity with the original pre-redesign one. Top to bottom: **template** select (when the org has issue templates; **required** when `publicTaskAllowBlank` is false, in which case the post button stays disabled and a hint shows until one is picked; picking one prefills title prefix, the editor's details, kind, priority and labels, and the visitor can still change all of them), **kind** chips (`KindChips`, categories, gated by `publicTaskFields.category`), **title** with live similar posts, rich-text **details** (ProseKit `Editor`, media uploads go through `processUploads`), then **priority** (`PriorityPicker`, a native select, gated by `publicTaskFields.priority`) and **labels** (`LabelChips`, toggle chips from `usePublicOrganizationLayout().labels`, gated by `publicTaskFields.labels` and labels existing) from `PostOptions.tsx`. It submits with `createPublicTaskAction` (including `templateId`). `usePublicPostAbility()` (still exported from `components/public/public-task-creator.tsx`, which now holds only that hook) supplies `settings`, `loggedIn`, `canPost` and `needsFullForm` (= template required). The `sessionStorage` draft (per org, cleared on success/cancel) keeps title, details, kind, priority, labels and the chosen template, so a login round trip does not lose them or ask for the template again; "Start from scratch" clears priority/labels/kind/details like the old creator. After posting, the page shows `PostLiveCard` (link to the post, "Post another") instead of navigating away.

**Not panels** (static page columns inside the page content): the roadmap's footer card and the activity rail (`activity/ActivityRail.tsx`). `/roadmap` and `/activity` render a bare `<Page>` with no `panels`. Don't convert these into drawers.

## Decisions

- **Anonymous voting stays.** Votes are never login-gated (`useVote` doesn't read the session); the login prompt is only for commenting, posting and reactions.
- Voting is closed on `canceled` posts only (`isVotingClosed`).
- **Feedback is list-only** (no card grid, no `?layout`). The Feedback board is read-only and has no sub-grouping, grouping UI, saved views or drag; the Roadmap's look is the board's kanban in the portal theme, with portal `RoadmapCard`s inside.
- `canceled` ("Won't do") posts appear only under the **All** tab and only when the status filter explicitly includes them.
- The Activity page has Voted and Posted tabs only — **no Commented tab** (no endpoint for "my comments").
- **No org accent colour** and no org website/GitHub link buttons in the page head (no such org fields; adding them was out of scope).
- **No schema changes** and no new endpoints for the portal.
- Rows use Peek by default on desktop; modified clicks (cmd/ctrl/shift/alt/middle) fall through to the link.
- Closing behaviour of the board panel: the post header's X and a click on the already-selected row close the whole panel (the selected row's highlight goes with it, `?task` cleared; the next open starts on the overview), as do the overview header's X, Esc, drag-dismiss and the top-bar toggle close the whole panel (and clear `?task` if a post was showing). Esc closes the panel from anywhere on the page, in either view — that is Base UI's non-modal Drawer behaviour, shared with the post page's Details drawer.

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
6. **Don't fork the board for the portal.** A new post/column layout is a `BoardViewDefinition`, renderer slot or grouping passed to `BoardProvider` (module-level or memoised, incl. the `controlled` scope); a new token is a line in the `data-board-theme="portal"` block. Use `useBoardData()` inside board-side renderers, never `useLanderData()`. The Feedback `BoardDataSource` is `passthrough` — don't re-sort or re-filter inside the board; tabs/sort/filters belong in the page (their controls are in `BoardPageBar` via `BoardToolbar.tsx`).
7. Public-facing changes involving cookies, OAuth providers, account data or draft storage may need a `/legal` update — the new-post draft uses `sessionStorage` only.
