import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import { generateSlug } from "@repo/util";
import { IconArrowRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { createContext, type ReactNode, useCallback, useContext, useMemo } from "react";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { formatShortDate, pickLatestRelease } from "@/lib/portal/board-row";
import { getReleaseDate } from "@/lib/portal/status";
import type { PanelHeaderConfig } from "@/lib/sidebar/sidebar-store";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { usePublicPostAbility } from "../../public-task-creator";
import { usePeekEnabled } from "../peek/usePeekEnabled";
import { CategoryTag } from "../ui/CategoryTag";
import { Pill } from "../ui/Pill";
import { newPostLink } from "./new-post-path";
import { type BoardCounts, type PublicReleaseSummary, useReleaseTaskCount } from "./useBoardSideData";

/**
 * Id of the board's single right-hand panel. It shows the overview (composer, categories, latest release) by default
 * and swaps to a post (Peek) while one is selected. The board registers it on its `Page`; `BoardPanelProvider` drives it.
 * (Renamed from `public-peek-panel` so a persisted open/closed value from the old, closed-by-default panel is not reused.)
 */
export const PUBLIC_BOARD_PANEL_ID = "public-board-panel";

/** Everything the board panel's overview needs from the page, so its content can be a prop-less constant. */
interface BoardRailContextValue {
	releases: ReadonlyArray<PublicReleaseSummary>;
	counts: BoardCounts | undefined;
	/** Slug of the category filtering the board, if any. */
	activeCategorySlug: string | null;
	onCategoryChange: (slug: string | null) => void;
}

const BoardRailContext = createContext<BoardRailContextValue | undefined>(undefined);

/**
 * Wrap the board's `<Page>` in this. The panel's overview content (`RAIL_CONTENT`) is a module-level constant that
 * reads the board's data from here.
 */
export function BoardRailProvider({
	releases,
	counts,
	activeCategorySlug,
	onCategoryChange,
	children,
}: BoardRailContextValue & { children: ReactNode }) {
	const rail = useMemo<BoardRailContextValue>(
		() => ({ releases, counts, activeCategorySlug, onCategoryChange }),
		[releases, counts, activeCategorySlug, onCategoryChange]
	);

	return <BoardRailContext.Provider value={rail}>{children}</BoardRailContext.Provider>;
}

/** "Browse by category": name and open-post count per row; clicking one filters the board (click again to clear). */
function CategoriesCard({
	categories,
	counts,
	activeSlug,
	onSelect,
}: {
	categories: ReadonlyArray<schema.categoryType>;
	counts: BoardCounts | undefined;
	activeSlug: string | null;
	onSelect: (slug: string | null) => void;
}) {
	if (categories.length === 0) return null;

	return (
		<Card className="p-5">
			<h3 className="mb-3 font-semibold text-[13px]">Browse by category</h3>
			<ul>
				{categories.map((category) => {
					const slug = generateSlug(category.name);
					const active = activeSlug === slug;
					const count =
						counts?.categories.find((entry) => entry.id === category.id)?.count ?? (counts ? 0 : undefined);
					return (
						<li key={category.id}>
							<button
								type="button"
								aria-pressed={active}
								onClick={() => onSelect(active ? null : slug)}
								className={cn(
									"-mx-2.5 flex h-11 w-[calc(100%+1.25rem)] cursor-pointer items-center justify-between rounded-lg px-2.5 text-left outline-none transition-colors hover:bg-accent md:h-9",
									active && "bg-muted"
								)}
							>
								<CategoryTag category={category} className={cn(active && "text-foreground")} />
								{count !== undefined && (
									<span className="text-[13px] text-muted-foreground tabular-nums">{count}</span>
								)}
							</button>
						</li>
					);
				})}
			</ul>
		</Card>
	);
}

/** "Latest release": the newest released release with its version, name, date and (when known) shipped-post count. */
function LatestReleaseCard({ orgSlug, releases }: { orgSlug: string; releases: ReadonlyArray<PublicReleaseSummary> }) {
	const latest = useMemo(() => pickLatestRelease(releases), [releases]);
	const taskCount = useReleaseTaskCount(orgSlug, latest?.slug ?? null);

	if (!latest) return null;

	const date = formatShortDate(getReleaseDate(latest), new Date(), true);
	const shipped = taskCount === null ? null : `${taskCount} ${taskCount === 1 ? "post" : "posts"} shipped`;

	return (
		<Card className="p-5">
			<div className="mb-3 flex items-center justify-between gap-2">
				<h3 className="font-semibold text-[13px]">Latest release</h3>
				<Pill variant="gh">{latest.slug}</Pill>
			</div>
			<Link
				to="/orgs/$orgSlug/releases/$releaseSlug"
				params={{ orgSlug, releaseSlug: latest.slug }}
				className="block outline-none"
			>
				<p className="font-semibold text-sm leading-[21px] tracking-[-0.006em]">{latest.name}</p>
				<p className="mt-1.5 text-[13px] text-muted-foreground">{[date, shipped].filter(Boolean).join(" · ")}</p>
			</Link>
			<div className="my-3.5 h-px bg-border" />
			<Link
				to="/orgs/$orgSlug/releases"
				params={{ orgSlug }}
				className="inline-flex items-center gap-1.5 font-medium text-[13px] text-primary max-md:min-h-11 hover:underline focus-visible:underline"
			>
				Read the changelog
				<IconArrowRight aria-hidden className="size-3.5" />
			</Link>
		</Card>
	);
}

/**
 * Body of the board panel while no post is selected: the "Share an idea" card (a link to the full new-post form, hidden
 * when the viewer can not post), "Browse by category" and "Latest release". Takes no props (it reads the board's data
 * from `BoardRailProvider`), so it is handed to the panel store once as `RAIL_CONTENT` and stays live by itself.
 */
export function BoardRailContent() {
	const { organization, categories } = usePublicOrganizationLayout();
	const rail = useContext(BoardRailContext);
	if (rail === undefined) {
		throw new Error("BoardRailContent must be used within a BoardRailProvider");
	}
	const { counts, releases, activeCategorySlug, onCategoryChange } = rail;
	const { canPost } = usePublicPostAbility();
	const desktop = usePeekEnabled();
	const hasLatestRelease = useMemo(() => pickLatestRelease(releases) !== null, [releases]);

	// Below 1024px the panel is a modal sheet over the list: once a category is picked, get out of the way so the
	// filtered list is visible. On desktop the panel sits beside the list and stays open.
	const handleCategorySelect = useCallback(
		(slug: string | null) => {
			onCategoryChange(slug);
			if (!desktop) sidebarActions.close(PUBLIC_BOARD_PANEL_ID);
		},
		[onCategoryChange, desktop]
	);

	const isEmpty = !canPost && categories.length === 0 && !hasLatestRelease;

	return (
		<div className="flex flex-col gap-4 p-1">
			{canPost && (
				<Card className="p-5">
					<h2 className="mb-1 font-semibold text-[15px]">Share an idea or report a bug</h2>
					<p className="mb-3.5 text-[13px] text-muted-foreground leading-[19px]">
						Search first. If someone already posted it, give it your vote instead.
					</p>
					<Button
						render={<Link {...newPostLink(organization.slug)} />}
						nativeButton={false}
						size="sm"
						className="w-full max-md:h-11"
					>
						Write a post
					</Button>
				</Card>
			)}
			<CategoriesCard
				categories={categories}
				counts={counts}
				activeSlug={activeCategorySlug}
				onSelect={handleCategorySelect}
			/>
			<LatestReleaseCard orgSlug={organization.slug} releases={releases} />
			{isEmpty && (
				<p className="px-2 py-6 text-center text-[13.5px] text-muted-foreground">Nothing to show here yet.</p>
			)}
		</div>
	);
}

/** Stable element handed to the panel store once (it holds no props, see `BoardRailContent`). */
export const RAIL_CONTENT = <BoardRailContent />;

/** Header for the overview: the native bar with its built-in close button (which closes the whole panel). */
export const RAIL_HEADER: PanelHeaderConfig = { title: "Overview" };
