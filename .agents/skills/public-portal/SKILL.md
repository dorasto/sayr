---
name: public-portal
description: The public org portal (`{org}.sayr.io`, SAY-81 redesign) — route map, styling rules (admin tokens and `@repo/ui`, no portal design system), the few `portal/ui` pieces, pure `lib/portal` logic, shared hooks and query keys, which pages use which panel, how Feedback/Roadmap/Activity run on the shared board, and the data constraints the design works around. Use whenever adding or changing anything under `apps/start/src/components/public/**`, `lib/portal`, `hooks/portal`, or `routes/orgs/$orgSlug/**`.
metadata:
  audience: developers
  workflow: feature-development
---

## Overview

The public org pages are an end-user feedback portal (board, post, new post, roadmap, activity, changelog). **They are built exactly like the admin UI**: the admin tokens (`bg-card`, `bg-accent`, `border-border`, `text-muted-foreground`, `primary`…), the shared `@repo/ui` components (`Button`, `Tabs`, `DropdownMenu`, `Label`, `Avatar`, `Skeleton`…), and the board's own `Field*` components for task fields. There is no portal token system or portal primitive layer any more — an earlier version had `--portal-*` tokens, `PortalButton`/`PortalCard`/`PortalTabs`/`ListContainer`/`EmptyState`, and a `data-board-theme="portal"` re-theme block; all of it was deleted. The mistakes this skill prevents: rebuilding a parallel `portal-*` design system, rebuilding a status/category/label chip the board already has, hiding classNames in config/const files, and putting derivation logic in a component where it can't be unit-tested.

**The Feedback board, the Activity list and the Roadmap render through the admin board system** (`apps/start/src/components/board/`, see the `board` skill) as read-only `BoardProvider`s. The page keeps data fetching, tabs/sort/filters, loading/error/empty states and panels; the board owns how the posts are laid out. Fix a layout/column problem in the board or in the provider config below, don't rebuild a portal-only list/column.

**Code shape** follows AGENTS.md "Component Structure": **one component per file** (`interface …Props` above `export function`; hooks → effects → handlers → render), classNames written inline on the element that renders them (no className maps in config/const files, no hops through wrapper components or contexts just to pass styling), and no `after:`/`before:` stretched-link tricks — make the element that should be clickable the `Link` itself.

Design constraints that still hold: **no schema changes**, internal statuses are relabelled for end users (not remapped), SSR/SEO on `/{shortId}` is untouched, realtime (SSE) handlers are kept.

## Route map

All under `apps/start/src/routes/orgs/$orgSlug/`. Link with `to="/orgs/$orgSlug/..."` (the subdomain rewrite lives in `router.tsx`).

| Path | Route file | Screen | Panel |
|---|---|---|---|
| `/` (board) | `index.tsx` → `components/public/index.tsx` (`PublicOrgHomePage`) → `task-view.tsx` (hosts the shared `<Board />`; each post is `task-item.tsx`) | Top bar (`BoardPageBar`) holding only the panel toggle; above the posts the **Feedback card** (`BoardFeedbackCard`: "Share your feedback" heading, "Write a post", then the sort tabs, filters and the Roadmap toggle); posts as a **list of cards only**, "Show more posts", or with `?layout=roadmap` the **roadmap kanban** (no page scroll, columns scroll) | **Board panel** (`public-board-panel`): overview (categories, latest release) or a post (Peek) |
| `/{shortId}` | `$shortId/index.tsx` → `components/public/public-task-content.tsx` | Post page: 760px article column | `public-task-panel` (Details) |
| `/new` | `new/index.tsx` → `portal/new/NewPostPage` | New post (`?title=`) — the **only** way to post (see "New post form") | none |
| `/roadmap` | `roadmap/index.tsx` | Redirects to `/?layout=roadmap` (the roadmap is a layout of the Feedback board; no nav link of its own) | — |
| `/activity` | `activity/index.tsx` | Redirects to `/?settings=activity` (the Activity tab of the account dialog) | — |
| `/releases` | `releases/index.tsx` → `components/public/releases/releases-changelog.tsx` | Changelog, laid out like Feedback: `Page` + `BoardPageBar panelId=…` + a right panel. Main column = released releases grouped by month (`groupReleasesByMonth`) as `portal/releases/ReleaseCard`s (whole card links to the release; first image in the notes is the cover via `getFirstImage`; text via `getReleaseExcerpt`; "N posts shipped"). Panel = `ChangelogRail`: "Coming next" with each upcoming release's progress, and a link to Feedback. Progress comes from `useReleaseProgress` (the single-release endpoint + `getReleaseProgress`, same as the release page), sharing its cache key with `useReleaseTaskCount`. No `?tab` param any more | none |
| `/releases/{slug}` | `releases/$releaseSlug/index.tsx` | Release page | `public-release-detail-panel` |

`route.tsx` (layout) wraps everything in `<div className="portal flex h-dvh flex-col overflow-hidden bg-sidebar text-foreground">` (the `portal` class is only a hook for the reduced-motion block, see Styling), renders `PublicNavigation` (64px top bar, `components/public/navigation.tsx`: org mark, Feedback/Changelog, search palette, Log in / avatar; the avatar opens the account settings dialog, see below) and `MobileTabBar` (`portal/nav/MobileTabBar.tsx`, phones only). `isPortalPage` (a regex over the pathname: the org root, or `/{digits|new|roadmap|activity|releases}`) decides the scroll container: for portal pages the `Outlet` is rendered bare inside `#public-scroll-container` because every portal page renders its own `Page` (which owns scrolling and its panel). That container is `isolate` (its own stacking context) — without it the drawer's `z-[10010]` escapes and dev overlays such as the shadcn inspector draw behind panel content. The `else` branch (card chrome with `bg-background`) is only the fallback for unmatched paths — a new top-level public route must be added to the regex or it gets the old card chrome. Active-nav logic is `lib/portal/nav.ts` (`getPortalSection`, `hidesMobileTabBar`) — extend it when adding a section.

## Styling

- **Admin tokens only.** The layout is `bg-sidebar`; every page's `Page` content sits on `bg-background`; cards are `bg-card`; hover/selected is `bg-accent` or `bg-secondary`; lines are `border-border`; meta text is `text-muted-foreground`; the accent is `primary`. Never add `--portal-*`-style tokens or a `[data-board-theme]` override block — if something looks wrong, fix it with the admin tokens on the element itself.
- **The `.portal` class** on the layout wrapper exists only so `styles.css`'s `prefers-reduced-motion` block (no pulses, no popup animations, no transitions) is scoped to the portal. Popovers no longer need `className="portal"` (nothing depends on it except reduced motion).
- **Global heading CSS beats utilities.** `packages/ui/src/globals.css` styles `h1`–`h4` (e.g. `h2` → `text-3xl`) outside any layer, so `className="text-xl"` on an `<h2>` does nothing. Use `Label variant="heading"` (add `block` and a size) for titles in compact UI such as the panel, or accept the global size.
- **Panel content never pads its own root.** The `IndentDrawer` panel already pads its body; a view rendered into a panel (Peek, the overview rail, skeletons, error states) starts with an unpadded root and spaces its children with `gap`.
- **Rich text** uses the ProseKit `Editor` read-only inside `COMMENT_PROSE` / `DESCRIPTION_PROSE` (`portal/post/prose.ts`), which map Tailwind Typography onto the admin tokens and trim the editor's own (unlayered, so `!`-overridden) first/last block padding.
- Rounded corners: chips and small buttons are `rounded-lg`, cards `rounded-xl`.

## Shared pieces (`components/public/portal/ui/`)

Only what the admin side doesn't already have. All use admin tokens:

| Piece | Use |
|---|---|
| `StatusChip` | Status pill for places **outside** a `BoardProvider` (Peek, post page, roadmap column headers, search). Built on the admin `StatusIcon` + `statusConfig` (`components/tasks/shared/config.tsx`) with the public label from `getPortalStatus`. Inside a board use `FieldStatus` instead |
| `CategoryTag`, `LabelTag`, `ReleaseTag` | Read-only category / label / release references outside a board (inside one use `FieldCategory`/`FieldLabel`; `ReleaseTag` is still used on rows because public releases are summaries, not `releaseType` rows) |
| `Pill` | Byline pills: `variant` Author / Team / `gh` |
| `VoteBox` | The upvote toggle (stops the click so it never opens a row). `size`: `chip` (status-pill sized, used top-right on board cards and in Peek), `sm`/`md` (stacked boxes, post page and similar posts). Outlined; voted = `primary` tint + border |
| `SegmentedProgress`, `BarRow` | Release progress bar and "What it touches" rows |

Reuse what already exists instead of re-implementing: `@repo/ui` (`Button`, `Tabs`/`TabsList`/`TabsTab` from `cossui/tabs`, `DropdownMenu*`, `Select`, `Label`, `Avatar`, `Skeleton`, `headlessToast`), the board `Field*` components, `Avatar`/`getInitials`/`ensureCdnUrl`, `formatTaskKey`/`formatCount`/`formatDate*` from `@repo/util`, the ProseKit `Editor`. Login prompts use `LoginDialog` (`components/auth/login`) as a trigger wrapper. The comment box and reply box share the admin comment box's shape (`rounded-lg border bg-accent/50`, button beside a one-line draft, below a longer one) via `isMultiline` from `components/shared/comments/comment-input.tsx`.

Screen-specific pieces sit in sibling folders: `board/`, `post/`, `peek/`, `new/`, `releases/`, `roadmap/`, `activity/`, `search/`, `nav/`.

## Account settings dialog

Most portal users never visit `admin.*`, so personal settings live in `UserSettingsDialog` (`components/settings/user-settings-dialog.tsx`), opened from the nav avatar. Its General (profile and preferences together), Security, Connections and Privacy tabs render **the same self-contained sections as the admin `/settings` pages** (`components/settings/sections/*`: `SecuritySettings`, `ConnectionsSettings`, `DataExport`; General/Preferences come from `pages/admin/settings/user-settings-content`). Each section loads its own data with React Query through session-derived server functions (`lib/serverFunctions/account-settings.ts`, which never take a user id as input), so neither host needs a route loader or the admin shell's `useLayoutData()`. Add a personal setting as a section there and render it in both places; don't build a portal-only copy or link out to admin. Only API keys (a developer tool with its own side panel) and Dashboard link to admin; `TabbedDialog` marks every `href` item with a trailing external-link icon.

`?settings=<tab>` on any portal page opens the dialog on that tab (`USER_SETTINGS_TABS` / `isUserSettingsTab`; closing it strips the param). Connections passes `<current page>?settings=connections` as the OAuth `callbackURL`, so linking an account returns to the dialog on the org subdomain. This works because the session cookie is shared across `*.${VITE_ROOT_DOMAIN}` and passkeys use `rpID = VITE_ROOT_DOMAIN` (`packages/auth/src/index.ts`) — a custom org domain would break both.

**"Confirm it's you"**: Better Auth only allows adding a passkey and listing/revoking sessions within a day of signing in (`freshAge`); after that it returns `SESSION_NOT_FRESH`. `SecuritySettings`/`PasskeySection` catch it (`lib/auth/reauth.ts`) and send the user to `/auth/reauth?redirect=<absolute URL>` on the main app host, which offers their own sign-in methods (linked providers, passkey, password) and returns them (only to the root domain or a subdomain, `isSafeReturnUrl`). The dialog passes `<page>?settings=security` so they land back in it. Auth links in emails must be absolute (`VITE_URL_ROOT`): a relative `redirectTo`/`callbackURL` resolves against the auth base URL, the bare root domain in production.

## Feedback, Activity and Roadmap on the shared board

All mount `BoardProvider` with `capabilities={READ_ONLY_CAPABILITIES}` (so `Field*` components render their static read-only form). Feedback and Roadmap also pass a **`controlled`** scope and module-level (stable) `views`/`renderers`. Never edit, select, drag, bulk-edit or save views here. Read the `board` and `board-saved-views` skills for the contracts; this is how the portal uses them.

### The post card (`components/public/task-item.tsx`)

`PublicTaskItem({ task, compact? })` is one component, used as the Feedback board's `renderers.row` and rendered directly by Activity. The root is a `div` card (`rounded-xl bg-card`, `hover:bg-secondary`, selected = `data-selected` while the post is open in Peek); inside it the post content is the `Link` and `VoteBox size="chip"` sits beside it top-right (a button may not be nested in a link). Top to bottom: `FieldStatus` with the public `label` (status pill), title (`Label variant="heading"`, one line), excerpt (one line, always reserves its line so every card is the same height; `compact` drops it), then one meta row: author avatar + name, date, `FieldCategory` + `ReleaseTag`/`FieldLabel` (md+ only, not rendered when empty), GitHub icon, comment count last. It reads releases with `useBoardReleases` and the Peek context with `useContext(PeekContext)` (optional: Activity has none, so the link just navigates). Because it uses `Field*`, **a `BoardProvider` must be above it** — Activity wraps its list in one.

### Feedback (`components/public/task-view.tsx`, `portal/board/`)

- **Page owns the controller.** `PublicOrgHomePage` keeps `useBoardList`, realtime, counts, sort/filter/layout state, `filterBoardTasks`/`sortBoardTasks` and the `?sort`/`?status`/`?labels`/`?category`/`?layout` params. There are **no Active/Done/All tabs** (`?tab` is ignored): the list shows open statuses, and the internal `BoardTab` is derived — `"all"` (closed posts loaded too) when the status filter includes Done or Won't do, else `"active"`. The sort tabs (Most voted / Newest / Recently updated), filter menu (every status in list mode, none on the roadmap) and the Roadmap toggle (`layout` + `onLayoutChange`, `?layout=roadmap`) are `BoardControls.tsx` (built from `@repo/ui` `Tabs` and `DropdownMenu`; `BoardToolbarProps` is exported from there), the bottom row of `BoardFeedbackCard.tsx` (a doras-ui `Tile`: heading, the org description (hidden when empty), "Write a post" when `canPost`, then the controls under a divider), which `PublicTaskView` renders above the posts through its `header` prop. `BoardPageBar.tsx` (the `Page` `header`, h-11 desktop, h-14 phones) now only holds the panel toggle. Every top-bar and panel-header button (sort, filter, panel toggles, back links, Peek actions, "Open internally", the shared panel close) follows the admin view-options button: `type="button" size="sm"`, `className="h-6 w-6 gap-2 p-1"` (text buttons keep `h-6` with `px-2`), and `variant={open ? "secondary" : "ghost"}` for anything that toggles something open (the filter also stays `secondary` while filters are active). The sort and filter menu options use `OPTION_CLASS` in `BoardControls.tsx`: no radio dot or check mark, chosen options get `bg-secondary`; statuses show the board's `STATUS_CONFIG` icon, categories their `RenderIcon` in colour, labels the board's `LabelBadge`. `PublicOrgHomePage` builds `toolbar` on every render and passes `<BoardFeedbackCard toolbar={toolbar} />` as `PublicTaskView`'s `header` — don't hoist it into a module constant or a `useMemo` with a partial dependency list, or sort/filter/layout changes go stale.
- `PublicTaskView` builds a `BoardDataSource` from the *already visible, already ordered* posts with **`passthrough: true`**, `pagination {hasMore, isFetchingMore, loadMore, loadMoreLabel: "Show more posts"}`, the org's `labels`/`categories` and empty `releases`. Its provider inputs are module constants in the same file: `PUBLIC_BOARD_VIEWS = [FLAT_LIST_VIEW]` (list, every post a flat row in server order — never nested), `PUBLIC_BOARD_RENDERERS = { row: PublicTaskItem }`, and `PUBLIC_BOARD_SCOPE` (`controlled`, grouping `none` via `pageLocalGrouping`, `showCompletedTasks: true`; `onChange` ignored). The default `BoardLoadMore` is the footer.
- **List only**: no layout switch, no `?layout` (and never `?view`, the admin saved-view pointer). `CARD_VIEW` exists in `components/board` but the public board doesn't register it.
- **Stays page-level** (not `renderers.states`), all inline in `PublicTaskView`: the error card, the `Skeleton` rows, and `BoardEmptyState` (first run / no active posts / no filter matches). It also renders `<BoardFooter />` under the skeleton/empty states so "Show more posts" stays reachable when filters hide everything while more pages exist. `BoardPanelProvider` / `?task` / Peek / the overview rail sit outside the board.

### Activity (`portal/activity/`)

**Activity is a tab of the account settings dialog**, not a page: `PublicNavigation` passes `<ActivityBody userId stacked />` as the dialog's `activity` prop (`stacked` = one column, the dialog is too narrow for the sidebar). `ActivityBody` (wraps the list in a read-only `BoardProvider` with `{ items: posts, labels, categories, releases: [] }` and renders `PublicTaskItem compact` per post), `ActivityEmpty`, `ActivityRowSkeletons`.

### Roadmap (`portal/roadmap/`)

- The roadmap is the Feedback board's `?layout=roadmap`. `PublicRoadmapView` (rendered by `PublicOrgHomePage` instead of `PublicTaskView`, inside a `flex h-full flex-col` wrapper with `BoardPageBar`) keeps `useRoadmap` (paging, realtime), applies the board's category/label filters (`filterBoardTasks`, tab `"all"`), owns the loading skeleton and error state, and renders the Feedback card then `RoadmapBoard` in a `min-h-0 flex-1` box: the page does not scroll, each column does (like admin `/home`).
- `RoadmapBoard` is a read-only `BoardProvider` with **one view**, `KANBAN_VIEW` (full height, bounded by the host), fed the org's real `labels`/`categories` and the public releases (the public releases endpoint returns full rows; `PublicReleaseSummary` is `schema.releaseType`), so the board's `Field*` chips resolve. `renderers = { card: RoadmapBoardCard, footer: RoadmapFooter }`. **`RoadmapBoardCard` is the admin `BoardCard`**, configured through its optional props: `link` (the public post), `onLinkClick` (`openPost`, so a click opens the board panel like a list row), `header` (the category as a `FieldCategory` chip in the task key's place, `null` when the post has none: the key is irrelevant to readers), `fields` (`release` only: no labels, priority or assignees), `selected` (open in the panel) and `vote` (the `VoteBox` chip in place of the read-only count). Don't give the roadmap its own card markup again. The scope is a module-level `controlled` `ROADMAP_SCOPE` (page-local grouping, `viewMode: "kanban"`).
- `createRoadmapGroupings(releasesById)` (in `roadmap-board.tsx`) returns one `BoardGroupingDefinition`, `roadmap-status` (Planned / In progress / Done recently), passed as `BoardProvider groupings` (memoised on `releasesById`). It is `persistable: false`, `canSubGroup: false`, **`ownsMembership`** (the roadmap decides which posts appear and their order, so the board skips its completed filter and sort), **`keepEmptyColumns`**, and has no `getDropPatch`. Columns are dressed like the admin status columns (`asStatusColumn`: `STATUS_CONFIG` icon + the exported `STATUS_TONE_CLASSES` tint, no description; the empty message stays). (The old "By release" columns were dropped; `toBoardColumns("release", …)` still exists in the lib, unused.)
- `lib/portal/roadmap-columns.ts` is the pure core: `toBoardColumns(mode, items, releasesById, now)` (`"status" | "release"`) built on `buildStatusColumns`/`buildReleaseColumns` in `lib/portal/roadmap.ts`, with an injected `now` (tests cover the 90-day rule). It imports the `BoardColumn` type from the board relatively.
- **Paging**: `useRoadmap`'s `capped`/`showMore`/`isFetchingMore` map to `pagination {hasMore: capped, …, loadMoreLabel: "Show more"}`; because `hasMore` is true, kanban column counts with a custom header show a trailing "+" (lower bound).

## Pure logic (`lib/portal/`)

Derivation logic goes here, not in components. Each module has a `*.test.ts` beside it. **Imports inside `lib/portal` are relative (`./time`) and there are no `@/` imports at all** (a relative type-only import of a board type, as `roadmap-columns.ts` does, is fine): `apps/start/vitest.config.ts` has no `@/` alias and no jsdom, so tests only run on pure modules. Run with `pnpm -F start test`.

| Module | What it does |
|---|---|
| `status.ts` | Relabel (`backlog`→Open, `todo`→Planned, `in-progress`→In Progress (same casing as the admin UI), `done`→Done, `canceled`→Won't do), `getStepperIndex`, `isVotingClosed` (canceled only), `isShipped` (done + release `released`), `getReleaseDate` |
| `board-filters.ts` | Tabs (`active`/`done`/`all`), `matchesTab`, `filterBoardTasks`, `countByTab`, `sortBoardTasks` (incl. client-side "updated") |
| `board-row.ts` | Row date/name formatting, `pickLatestRelease`, `parseCsvParam` |
| `excerpt.ts` | `buildExcerpt`: wraps `extractTaskText` after skipping headings/code/images and issue-template prompt lines |
| `duplicates.ts` | Duplicate-title scorer (stoplist, min length, limit 3) |
| `related.ts` | `findRelatedPosts` (category/label overlap) |
| `latest-update.ts` | `getLatestUpdate`: newest top-level public comment by a team member, shown as the "Latest update" card above the post description (it is also still in the conversation) |
| `team.ts` | `isTeamMember`, `findTeamMemberUser` over `organization.members[].user.id` |
| `task-keys.ts` | `linkifyTaskKeys`: turns `SAY-69` text into link segments using the org prefix |
| `github-issue.ts` | `parseGithubIssueUrl` → `{repo, number}` |
| `peek.ts` | Peek helpers: `PEEK_DESKTOP_QUERY` (`>=1024px`), `normalizeShortId`, `shouldInterceptRowClick`, `mapPublicTask` |
| `board-panel.ts` | Board panel decisions: `getUrlSyncAction` (what `?task` / the viewport asks of the panel: show post, show overview, redirect below 1024px, clear on narrowing) and `getRowClickAction` (select / deselect / follow link) |
| `new-post.ts` | `POST_PRIORITIES`/`isPostPriority`, `docHasContent`, sessionStorage draft (title, details, category, priority, labels, template) (de)serialisation, `resolveInitialDraft`, `mergeSimilarPosts` |
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
| `public-board-panel` (`PUBLIC_BOARD_PANEL_ID`, exported from `portal/board/BoardRailContent.tsx`) | Board | The board's one right panel, `defaultOpen: true`, persisted open/closed and resized width, `width: "380px"`, min 280 / max 720, phone sheet `height: "70dvh"`. Shows the **overview** (`BoardRailContent` / `RAIL_CONTENT` + `RAIL_HEADER` "Overview": `CategoriesCard`, `LatestReleaseCard`) by default, and swaps to the selected **post** (Peek, see below) while `?task=<shortId>` is set. Peek is desktop (>=1024px) only; narrower viewports navigate rows to `/{shortId}` and use the panel as a modal sheet (`usePanelViewportDefaults`: closed on load, opened by the top-bar toggle; the Feedback card's "Write a post" links straight to `/new`). The open post's row is marked selected; rows keep their layout. Pattern: see "Board panel" in `page-component` |
| `public-task-panel` (`PUBLIC_TASK_PANEL_ID`) | `/{shortId}` | "Details" drawer, `defaultOpen: true`, 380px: `PostDetails` and `RelatedPosts` (`components/public/panels/`, one file each; `task.tsx` composes them and reads `usePublicTask()`). No cards: `PostDetails` is one `DetailSection` row per field (small label with the value beside it), in this order: Status, Category, Created by (author, Team pill, "on <date>"), Release, Assigned to, Labels, GitHub. Values are the board's read-only `Field*` components (`FieldStatus`, `FieldCategory` — now with the category icon, like `FieldRelease`'s rocket — `FieldRelease`, `FieldAssignee`, `FieldLabel` rendered once per label); `PublicTaskContent` wraps its `Page` in a `BoardProvider` (`items: [task]`, `READ_ONLY_CAPABILITIES`) so they work in the panel. Category and each label link to the board filtered by them (`?category=<slug>`, `?labels=<id>`, typed by a pass-through `validateSearch` on `routes/orgs/$orgSlug/index.tsx`); the release links to its page. `RelatedPosts` sits under its own heading below (statuses via `FieldStatus`). Priority and updated date are not shown publicly. The page itself is title → description → a line with the task key and the `VoteBox` chip (phones vote from the sticky action bar) → status banner / latest update → sub-tasks → conversation. |
| `public-release-detail-panel` | `/releases/{slug}` | Progress, What it touches, Details; `defaultOpen: true`, 380px (`portal/releases/ReleaseDetailPanel.tsx`) |

The board has no static right column: categories and latest release are the panel's overview view. "Write a post" (in `BoardFeedbackCard`, above the posts) is just a link to the full form via `newPostLink`, shown only when `usePublicPostAbility().canPost`; there is no quick composer on the board (templates, priority and labels have one home, `/new`). The data the overview reads (`useBoardRail`) lives in `BoardRailProvider` (`portal/board/`), not in the panel content, because panel content unmounts when it swaps to a post or the panel closes. Don't move state into `BoardRailContent`.

**Peek** (the post view of the board panel, `portal/peek/`): `PEEK_HEADER` (`PeekKeyPill` + `PeekHeaderActions`: copy link, "Open full page", close) and `PEEK_CONTENT` → `PeekPanelContent` → `PeekPostView`. It is a clean overview where a visitor can still do everything: a top row of `StatusChip`, `CategoryTag`, `ReleaseTag` and `VoteBox size="chip"` on the right; the title (`Label variant="heading"`); author, date and GitHub link; the full description (`PeekDescription`, not clamped); then the whole `PublicComments` thread (replies, reactions, edit/delete, comment box). Comments follow the admin timeline: Reply, the admin `ReactionPicker` and the actions menu sit hover-only at the right of the header (reaction chips always show; no Reply action once a comment shows "N replies"), threads with replies start expanded, and internal comments get a light `bg-primary/5` tint and a lock icon. "Copy link" in the menu gives `/{shortId}?comment=<id>`; `PublicComments` reads `?comment` through `useTasksSearchParams` (`setTask` clears it), highlights that comment and keeps it centred while the post loads (`useScrollIntoViewWhileSettling`, which scrolls only the nearest scroll area so the panel header never moves). The post page's big vote button, `Stepper`, `PostStatusBanner` and `LatestUpdateCard` are deliberately **not** in Peek. `PeekSkeleton` mirrors the layout.

### New post form (`/new`)

`portal/new/NewPostPage.tsx` is the single creator and is built like the admin task creator (`components/tasks/task/creator/index.tsx`): no page heading or intro copy, no card around it — the form sits on the page and the page scrolls (the outer `h-full overflow-y-auto` wrapper; the details editor grows with its content and has no scroll of its own). Every piece is its own file in `portal/new/`.

- **Template first.** When the org requires a template (`needsFullForm`: templates exist and `publicTaskAllowBlank` is false), only `TemplateChooser` (a list of `doras-ui` `Tile`s) shows until one is picked. Otherwise the form shows `TemplatePicker` (the admin creator's `ComboBox` chip; "No template" is hidden when one is required). Picking a template sets every field from it, like admin (category, priority, labels, details; its title prefix is prepended to the current title).
- **Form, top to bottom:** template chip and `PostTitleField` (`Input variant="strong"`) in a sticky header, then live similar posts as their own block outside it (`SimilarPostsList`/`SimilarPostRow`: status chip, title, vote chip), `PostDetailsEditor` (ProseKit `Editor`; formatting and images via its slash/inline menus, uploads through `processUploads`), the admin `TaskFieldToolbar variant="creator"` on a draft task (`id: "draft"` keeps the field chips from calling the API), and `NewPostFooter`.
- **Per-org fields stay gated.** The toolbar only gets `category` / `priority` / `labels` when `publicTaskFields.*` allows it (and categories/labels exist); submit sends only the allowed fields.
- **Submitting** uses `createPublicTaskAction` (incl. `templateId`) through `useToastAction().runWithToast`, then clears the draft, invalidates `boardListKey` and navigates to the new post. Logged-out visitors get the login dialog from the post button.
- `usePublicPostAbility()` (exported from `components/public/public-task-creator.tsx`, which holds only that hook) supplies `settings`, `loggedIn`, `canPost` (else `PostingDisabledCard`) and `needsFullForm`.
- The `sessionStorage` draft (per org, cleared on success/cancel) keeps title, details, category, priority, labels and template, so a login redirect does not lose them or ask for the template again. A `?title=` that differs from the stored title starts a fresh draft.

**Not panels**: Activity lives in the account dialog, not a page or a drawer. (The roadmap is a layout of the board and shares the board panel.)

## Decisions

- **Anonymous voting stays.** Votes are never login-gated (`useVote` doesn't read the session); the login prompt is only for commenting, posting and reactions.
- Voting is closed on `canceled` posts only (`isVotingClosed`).
- **Feedback is the list or the roadmap kanban** (`?layout=roadmap`; no card grid). The Feedback board is read-only and has no sub-grouping, grouping UI, saved views or drag; the Roadmap is the board's kanban with `RoadmapBoardCard`s inside.
- `canceled` ("Won't do") posts appear only under the **All** tab and only when the status filter explicitly includes them.
- The Activity page has Voted and Posted tabs only — **no Commented tab** (no endpoint for "my comments").
- **No org accent colour** and no org website/GitHub link buttons in the page head (no such org fields; adding them was out of scope).
- **No schema changes** and no new endpoints for the portal.
- Rows use Peek by default on desktop; modified clicks (cmd/ctrl/shift/alt/middle) fall through to the link.
- Closing a post in the board panel (the post header's X, or a click on the already-selected row) depends on how it was opened: if the panel was already open on the overview, it goes **back to the overview** and stays open; if the panel was closed (it opened for the post), the whole panel closes. Either way `?task` is cleared. `BoardPanelProvider` tracks this in a `returnToRail` ref set when a post is opened from the overview (switching straight from one post to another keeps the first decision). The overview header's X, drag-dismiss and the top-bar toggle always close the whole panel (and clear `?task` if a post was showing). Esc closes it only on mobile; on desktop `IndentDrawer` cancels Base UI's Escape close (see the `page-component` skill).

## Data constraints the design works around

- The internal list endpoint (`GET /api/internal/v1/admin/organization/task/tasks`) caps `limit` at **30**, has **no `status` or `labels` params**, supports `sortBy` = `newest|trending|mostPopular`, `category_id`, `q` (title+description, works for logged-out viewers) and `include_closed=true` (done + canceled). So status/label filters and the "updated" sort run **client-side over the loaded set**; the board keeps fetching a bounded number of pages (`MAX_AUTO_PAGES` in `components/public/index.tsx`) until enough rows are visible, then offers "Show more posts". Roadmap and Activity load pages up to a cap (`ROADMAP_INITIAL_PAGES`, `ACTIVITY_INITIAL_PAGES`) and offer "Show more"/"Load more".
- Counts come from `GET .../task/tasks/counts?org_id=` → `{open, categories:[{id,count}]}` (open public posts only): exact for the Active tab and the categories card. Done/All counts are only shown once every page of that query is loaded.
- Duplicate matching combines the client scorer over loaded posts with server `q` search (works for guests; don't use `/task/search`, which needs a login).
- **Team resolution** uses the layout loader's `organization.members[].user.id` (seat-assigned) via `lib/portal/team.ts` — Team pill, Latest update.
- **Release lead**: the public releases API doesn't resolve `leadId`, so it's looked up against `organization.members` and hidden when not found.
- Releases come from the public v1 API (`/api/public/v1/organization/{slug}/releases`): statuses `planned|in-progress|released|archived`; archived releases are hidden from the changelog and release tags.
- Votes: `POST .../task/create-vote` → `{taskId, voted, voteCount}`; works anonymously.

## Rules

1. Search `@repo/ui`, the board's `Field*` components, `portal/ui` and `lib/portal` before adding a component or helper; add a test beside any new `lib/portal` module.
2. Style with the admin tokens and `@repo/ui` components, with classNames inline on the element. No portal tokens, no theme override blocks, no `after:`/`before:` stretched links, one component per file, no root padding on panel content.
3. Task identifiers shown to users are `formatTaskKey(orgShortId, shortId)` — never a bare `shortId` or a `#` prefix (route params still use the raw number).
4. Wire panel content as stable constants / memoised JSX (see `page-component` Gotchas), and gate `setPanelContent` on `panel.isRegistered`.
5. A new top-level public route must be added to the `isPortalPage` regex in `route.tsx` and to `lib/portal/nav.ts` if it is a nav section.
6. **Don't fork the board for the portal.** A new post/column layout is a `BoardViewDefinition` (e.g. `FLAT_LIST_VIEW`, `PAGE_SCROLL_KANBAN_VIEW` in `board/views/view-registry.tsx`), renderer slot or grouping passed to `BoardProvider` (module-level or memoised, incl. the `controlled` scope). Task fields on a post use the board's `Field*` components (read-only under `READ_ONLY_CAPABILITIES`), so anything rendering them needs a `BoardProvider` above it. Use `useBoardData()` inside board-side renderers, never `useLanderData()`. The Feedback `BoardDataSource` is `passthrough` — don't re-sort or re-filter inside the board; tabs/sort/filters belong in the page (their controls are in `BoardPageBar`).
7. Public-facing changes involving cookies, OAuth providers, account data or draft storage may need a `/legal` update — the new-post draft uses `sessionStorage` only.
