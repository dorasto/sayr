import { Button } from "@repo/ui/components/button";
import { DialogClose } from "@repo/ui/components/dialog";
import { Kbd } from "@repo/ui/components/kbd";
import { cn } from "@repo/ui/lib/utils";
import { formatCount, formatTaskKey } from "@repo/util";
import { IconArrowRight, IconChevronUp, IconLoader2, IconPlus, IconRocket, IconSearch } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type KeyboardEvent, type MouseEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { usePortalSearch } from "@/hooks/portal/usePortalSearch";
import { includesGroup, SEARCH_FILTERS, type SearchFilter, splitHighlight, wrapIndex } from "@/lib/portal/search";
import { newPostLink } from "../board/new-post-path";
import { ReleaseStatusChip } from "../releases/ReleaseStatusChip";
import { StatusChip } from "../ui/StatusChip";

const ROW_CLASS =
	"mx-2 flex h-12 cursor-pointer items-center gap-3 rounded-lg px-4 text-foreground no-underline outline-none transition-colors aria-selected:bg-muted";
const GROUP_HEADING_CLASS = "px-6 pt-3 pb-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-[0.04em]";

/** Rows are links (so they can open in a new tab) acting as listbox options; a native <option> can't be a link. */
const OPTION_ATTRS = { role: "option", tabIndex: -1 } as const;

/** Keep focus in the search input when a row is pressed, so the click lands without a focus jump. */
const keepInputFocus = (event: MouseEvent) => event.preventDefault();

/** `<mark>` around the part of `text` that matches the query. */
function Highlight({ text, query }: { text: string; query: string }) {
	return (
		<>
			{splitHighlight(text, query).map((segment, index) =>
				segment.match ? (
					<mark
						// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
						key={index}
						className="rounded-[3px] bg-primary/15 px-px text-primary"
					>
						{segment.text}
					</mark>
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
					<span key={index}>{segment.text}</span>
				)
			)}
		</>
	);
}

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

	// Shared by every row: the option semantics plus select/hover wiring (`onClose` runs on click, navigation is the link's).
	const optionProps = (id: string, index: number) => ({
		...OPTION_ATTRS,
		id,
		"aria-selected": current === index,
		onMouseDown: keepInputFocus,
		onClick: onClose,
		onPointerMove: () => setActiveIndex(index),
	});

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
			<div className="flex h-[60px] shrink-0 items-center gap-3 border-b px-5">
				<IconSearch aria-hidden className="size-5 shrink-0 text-muted-foreground" stroke={1.75} />
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
					className="h-full min-w-0 flex-1 bg-transparent font-medium text-[17px] text-foreground outline-none placeholder:text-muted-foreground"
				/>
				{isSearching && (
					<IconLoader2
						aria-hidden
						className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
					/>
				)}
				<Kbd className="hidden sm:inline-flex">esc</Kbd>
				<DialogClose className="shrink-0 cursor-pointer rounded-md px-2 py-3 font-medium text-muted-foreground text-sm outline-none hover:text-foreground sm:hidden">
					Cancel
				</DialogClose>
			</div>

			{/* Filter chips */}
			<div className="flex shrink-0 gap-1.5 px-4 pt-3 pb-1">
				{SEARCH_FILTERS.map((option) => {
					const selected = filter === option.value;
					const count = counts[option.value];
					return (
						<Button
							key={option.value}
							type="button"
							variant="ghost"
							size="sm"
							aria-pressed={selected}
							onClick={() => {
								setFilter(option.value);
								resetSelection();
								inputRef.current?.focus();
							}}
							className={cn(
								"h-[30px] gap-1.5 rounded-md px-2.5 text-[13px] max-md:h-11 max-md:px-3.5 hover:text-foreground",
								selected && "bg-muted text-foreground"
							)}
						>
							{option.label}
							{count !== null && <span className="text-muted-foreground tabular-nums">{count}</span>}
						</Button>
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
				{isWaiting && <p className="px-6 py-6 text-center text-muted-foreground text-sm">Searching</p>}

				{hasNoMatches && (
					<div className="flex flex-col items-center gap-3 px-6 py-6 text-center">
						<p className="max-w-[360px] text-muted-foreground text-sm leading-[21px]">
							{isError
								? "Search didn't load. Check your connection and try again, or post it as a new idea."
								: `Nothing matches "${query}". Try fewer words, or be the first to ask for it.`}
						</p>
						<Button variant="outline" size="sm" onClick={clearSearch}>
							Clear search
						</Button>
					</div>
				)}

				{/* biome-ignore lint/a11y/useSemanticElements: a custom combobox listbox of link rows, not a <select> */}
				<div id={listId} role="listbox" aria-label="Search results" aria-busy={isSearching}>
					{posts.length > 0 && (
						// biome-ignore lint/a11y/useSemanticElements: a group inside a listbox, not a form <fieldset>
						<div role="group" aria-labelledby={`${baseId}-posts-heading`}>
							<div id={`${baseId}-posts-heading`} className={GROUP_HEADING_CLASS}>
								{isEmptyQuery ? "Popular posts" : "Posts"}
							</div>
							{posts.map((post, index) =>
								post.shortId == null ? null : (
									<Link
										key={post.id}
										to="/orgs/$orgSlug/$shortId"
										params={{ orgSlug, shortId: String(post.shortId) }}
										{...optionProps(postId(post.id), index)}
										className={ROW_CLASS}
									>
										<span className="hidden min-w-[58px] shrink-0 text-center text-[13px] text-muted-foreground tabular-nums sm:block">
											{formatTaskKey(orgShortId, post.shortId)}
										</span>
										<span className="min-w-0 flex-1 truncate font-medium text-[14.5px]">
											<Highlight text={post.title?.trim() || "Untitled post"} query={query} />
										</span>
										<StatusChip status={post.status} className="shrink-0" />
										<span className="hidden w-[38px] shrink-0 items-center gap-1 text-[13px] text-muted-foreground tabular-nums sm:inline-flex">
											<IconChevronUp aria-hidden className="size-3.5" stroke={2.4} />
											{formatCount(post.voteCount)}
											<span className="sr-only">{post.voteCount === 1 ? "vote" : "votes"}</span>
										</span>
										<span aria-hidden className="hidden w-4 shrink-0 text-muted-foreground sm:block">
											{current === index && <IconArrowRight className="size-4" />}
										</span>
									</Link>
								)
							)}
						</div>
					)}

					{releases.length > 0 && (
						// biome-ignore lint/a11y/useSemanticElements: a group inside a listbox, not a form <fieldset>
						<div role="group" aria-labelledby={`${baseId}-releases-heading`}>
							<div id={`${baseId}-releases-heading`} className={GROUP_HEADING_CLASS}>
								{isEmptyQuery ? "Latest releases" : "Releases"}
							</div>
							{releases.map((release, index) => (
								<Link
									key={release.id}
									to="/orgs/$orgSlug/releases/$releaseSlug"
									params={{ orgSlug, releaseSlug: release.slug }}
									{...optionProps(releaseId(release.id), posts.length + index)}
									className={ROW_CLASS}
								>
									<span aria-hidden className="hidden w-[58px] shrink-0 justify-center text-primary sm:flex">
										<IconRocket className="size-[18px]" stroke={1.75} />
									</span>
									<span className="min-w-0 flex-1 truncate font-medium text-[14.5px]">
										<Highlight text={release.slug} query={query} />
										{release.name.trim() !== "" && release.name !== release.slug && (
											<>
												<span className="text-muted-foreground"> · </span>
												<Highlight text={release.name} query={query} />
											</>
										)}
									</span>
									<ReleaseStatusChip status={release.status} className="shrink-0" />
									<span aria-hidden className="hidden w-[54px] shrink-0 sm:block" />
								</Link>
							))}
						</div>
					)}

					<div role="none" className={cn("mt-2 border-t pt-2", visibleCount === 0 && "mt-0 border-t-0")}>
						{/* Always last: carries the typed query to the new post form as `?title=`. */}
						<Link
							{...newPostLink(orgSlug, query)}
							{...optionProps(createId, createIndex)}
							className={cn(ROW_CLASS, "text-muted-foreground")}
						>
							<span
								aria-hidden
								className="hidden w-[58px] shrink-0 justify-center text-muted-foreground sm:flex"
							>
								<IconPlus className="size-[18px]" />
							</span>
							<span className="min-w-0 flex-1 truncate text-[14.5px]">
								{query ? (
									<>
										Not here? Post <b className="font-semibold text-foreground">&quot;{query}&quot;</b> as a
										new idea
									</>
								) : (
									"Not here? Post a new idea"
								)}
							</span>
							<span aria-hidden className="hidden w-4 shrink-0 text-muted-foreground sm:block">
								{current === createIndex && <IconArrowRight className="size-4" />}
							</span>
						</Link>
					</div>
				</div>
			</div>

			{/* Keyboard hints */}
			<div className="hidden shrink-0 gap-[18px] border-t bg-sidebar px-5 py-3 text-[12.5px] text-muted-foreground sm:flex">
				<span>
					<Kbd className="mr-1.5">{"↑↓"}</Kbd>move
				</span>
				<span>
					<Kbd className="mr-1.5">{"↵"}</Kbd>open
				</span>
				<span>
					<Kbd className="mr-1.5">esc</Kbd>close
				</span>
			</div>
		</>
	);
}
