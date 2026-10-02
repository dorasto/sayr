import { DialogClose } from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { IconLoader2, IconSearch } from "@tabler/icons-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePortalSearch } from "@/hooks/portal/usePortalSearch";
import { includesGroup, SEARCH_FILTERS, type SearchFilter, wrapIndex } from "@/lib/portal/search";
import { PortalButton } from "../ui/PortalButton";
import { CreateRow, PostRow, ReleaseRow, SearchGroup } from "./SearchRows";

const KBD_CLASS =
	"inline-flex h-5 items-center rounded-[5px] border border-portal-line-2 px-1.5 font-medium text-portal-fg-3 text-xs";

interface SearchPaletteProps {
	orgSlug: string;
	orgId: string;
	orgShortId: string;
	/** Closes the dialog (after a result is chosen). */
	onClose: () => void;
}

/**
 * The palette body: combobox input, All / Posts / Releases chips, a grouped listbox (arrow keys move through it,
 * Enter opens the active row) and a keyboard-hint footer. Mounted only while the dialog is open, so its queries and
 * state start fresh on every open.
 */
export function SearchPalette({ orgSlug, orgId, orgShortId, onClose }: SearchPaletteProps) {
	const baseId = useId();
	const listId = `${baseId}-list`;
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const [rawQuery, setRawQuery] = useState("");
	const [filter, setFilter] = useState<SearchFilter>("all");
	const [activeIndex, setActiveIndex] = useState(0);

	const results = usePortalSearch(orgId, orgSlug, orgShortId, rawQuery);
	const { query, isEmptyQuery, isSearching, isError } = results;

	const showPosts = includesGroup(filter, "posts");
	const showReleases = includesGroup(filter, "releases");
	const posts = useMemo(() => (showPosts ? results.posts : []), [showPosts, results.posts]);
	const releases = useMemo(() => (showReleases ? results.releases : []), [showReleases, results.releases]);

	// Rows are posts, then releases, then the always-present "post it as a new idea" row.
	const createIndex = posts.length + releases.length;
	const rowCount = createIndex + 1;
	const current = Math.min(activeIndex, rowCount - 1);

	const postId = (id: string) => `${baseId}-post-${id}`;
	const releaseId = (id: string) => `${baseId}-release-${id}`;
	const createId = `${baseId}-create`;

	const activePost = posts[current];
	const activeRelease = releases[current - posts.length];
	const activeId = activePost ? postId(activePost.id) : activeRelease ? releaseId(activeRelease.id) : createId;

	// Keep the active row visible; the first row also reveals its group heading.
	useEffect(() => {
		const list = listRef.current;
		if (!list) return;
		if (current === 0) {
			list.scrollTop = 0;
			return;
		}
		document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
	}, [current, activeId]);

	const resetSelection = () => setActiveIndex(0);

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.nativeEvent.isComposing) return;
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex(wrapIndex(current, event.key === "ArrowDown" ? 1 : -1, rowCount));
		} else if (event.key === "Enter") {
			event.preventDefault();
			// The row is a router `Link`: clicking it navigates and closes the palette.
			document.getElementById(activeId)?.click();
		}
	};

	const clearSearch = () => {
		setRawQuery("");
		resetSelection();
		inputRef.current?.focus();
	};

	const visibleCount = posts.length + releases.length;
	const hasNoMatches = !isEmptyQuery && !isSearching && visibleCount === 0;
	const isWaiting = !isEmptyQuery && isSearching && visibleCount === 0;

	let status = "";
	if (isEmptyQuery) status = "Showing popular posts and latest releases.";
	else if (isWaiting) status = "Searching";
	else if (hasNoMatches) status = `No results for ${query}.`;
	else status = `${visibleCount} ${visibleCount === 1 ? "result" : "results"} for ${query}.`;

	const counts: Record<SearchFilter, number | null> = isEmptyQuery
		? { all: null, posts: null, releases: null }
		: { all: null, posts: results.posts.length, releases: results.releases.length };

	return (
		<>
			{/* Input row */}
			<div className="flex h-[60px] shrink-0 items-center gap-3 border-portal-line border-b px-5">
				<IconSearch aria-hidden className="size-5 shrink-0 text-portal-fg-3" stroke={1.75} />
				<input
					ref={inputRef}
					type="text"
					role="combobox"
					aria-expanded="true"
					aria-controls={listId}
					aria-activedescendant={activeId}
					aria-autocomplete="list"
					aria-label="Search posts and releases"
					placeholder="Search posts and releases"
					autoComplete="off"
					autoCorrect="off"
					spellCheck={false}
					enterKeyHint="go"
					value={rawQuery}
					onChange={(event) => {
						setRawQuery(event.target.value);
						resetSelection();
					}}
					onKeyDown={handleKeyDown}
					className="h-full min-w-0 flex-1 bg-transparent font-medium text-[17px] text-portal-fg outline-none placeholder:text-portal-fg-3"
				/>
				{isSearching && (
					<IconLoader2
						aria-hidden
						className="size-4 shrink-0 animate-spin text-portal-fg-3 motion-reduce:animate-none"
					/>
				)}
				<kbd className={cn(KBD_CLASS, "hidden sm:inline-flex")}>esc</kbd>
				<DialogClose className="shrink-0 cursor-pointer rounded-portal-sm px-2 py-3 font-medium text-portal-fg-2 text-sm outline-none hover:text-portal-fg focus-visible:ring-2 focus-visible:ring-portal-focus sm:hidden">
					Cancel
				</DialogClose>
			</div>

			{/* Filter chips */}
			<div className="flex shrink-0 gap-1.5 px-4 pt-3 pb-1">
				{SEARCH_FILTERS.map((option) => {
					const selected = filter === option.value;
					const count = counts[option.value];
					return (
						<button
							key={option.value}
							type="button"
							aria-pressed={selected}
							onClick={() => {
								setFilter(option.value);
								resetSelection();
								inputRef.current?.focus();
							}}
							className={cn(
								"inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-portal-sm px-2.5 max-md:h-11 max-md:px-3.5 font-medium text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-portal-focus",
								selected
									? "bg-portal-raised text-portal-fg"
									: "text-portal-fg-2 hover:bg-portal-hover focus-visible:bg-portal-hover hover:text-portal-fg focus-visible:text-portal-fg"
							)}
						>
							{option.label}
							{count !== null && <span className="text-portal-fg-3 tabular-nums">{count}</span>}
						</button>
					);
				})}
			</div>

			{/* biome-ignore lint/a11y/useSemanticElements: <output> would not announce reliably in all screen readers */}
			<div role="status" aria-live="polite" className="sr-only">
				{status}
			</div>

			{/* Results */}
			<div
				ref={listRef}
				className="max-h-[min(440px,calc(100dvh-300px))] min-h-[84px] overflow-y-auto overscroll-contain pb-2"
			>
				{isWaiting && <p className="px-6 py-6 text-center text-portal-fg-3 text-sm">Searching</p>}

				{hasNoMatches && (
					<div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
						<p className="max-w-[360px] text-portal-fg-2 text-sm leading-[21px]">
							{isError
								? "Search didn't load. Check your connection and try again, or post it as a new idea."
								: `Nothing matches "${query}". Try fewer words, or be the first to ask for it.`}
						</p>
						<PortalButton size="sm" onClick={clearSearch}>
							Clear search
						</PortalButton>
					</div>
				)}

				{/* biome-ignore lint/a11y/useSemanticElements: a custom combobox listbox of link rows, not a <select> */}
				<div id={listId} role="listbox" aria-label="Search results" aria-busy={isSearching}>
					{posts.length > 0 && (
						<SearchGroup headingId={`${baseId}-posts-heading`} heading={isEmptyQuery ? "Popular posts" : "Posts"}>
							{posts.map((post, index) => (
								<PostRow
									key={post.id}
									post={post}
									orgSlug={orgSlug}
									orgShortId={orgShortId}
									query={query}
									id={postId(post.id)}
									active={current === index}
									onSelect={onClose}
									onHover={() => setActiveIndex(index)}
								/>
							))}
						</SearchGroup>
					)}

					{releases.length > 0 && (
						<SearchGroup
							headingId={`${baseId}-releases-heading`}
							heading={isEmptyQuery ? "Latest releases" : "Releases"}
						>
							{releases.map((release, index) => (
								<ReleaseRow
									key={release.id}
									release={release}
									orgSlug={orgSlug}
									query={query}
									id={releaseId(release.id)}
									active={current === posts.length + index}
									onSelect={onClose}
									onHover={() => setActiveIndex(posts.length + index)}
								/>
							))}
						</SearchGroup>
					)}

					<div
						role="none"
						className={cn("mt-2 border-portal-line border-t pt-2", visibleCount === 0 && "mt-0 border-t-0")}
					>
						<CreateRow
							orgSlug={orgSlug}
							query={query}
							id={createId}
							active={current === createIndex}
							onSelect={onClose}
							onHover={() => setActiveIndex(createIndex)}
						/>
					</div>
				</div>
			</div>

			{/* Keyboard hints */}
			<div className="hidden shrink-0 gap-[18px] border-portal-line border-t bg-portal-canvas px-5 py-3 text-[12.5px] text-portal-fg-3 sm:flex">
				<span>
					<kbd className={cn(KBD_CLASS, "mr-1.5")}>{"↑↓"}</kbd>move
				</span>
				<span>
					<kbd className={cn(KBD_CLASS, "mr-1.5")}>{"↵"}</kbd>open
				</span>
				<span>
					<kbd className={cn(KBD_CLASS, "mr-1.5")}>esc</kbd>close
				</span>
			</div>
		</>
	);
}
