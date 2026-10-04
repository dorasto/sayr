import { CommandGroup, CommandInput, CommandItem, CommandList } from "@repo/ui/components/command";
import { formatCount, formatTaskKey } from "@repo/util";
import { IconArrowBack, IconArrowsUpDown, IconChevronUp, IconLoader2, IconPlus, IconRocket } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePortalSearch } from "@/hooks/portal/usePortalSearch";
import { newPostLink } from "../board/new-post-path";
import { ReleaseStatusChip } from "../releases/ReleaseStatusChip";
import { StatusChip } from "../ui/StatusChip";
import { Highlight } from "./Highlight";

interface SearchPaletteProps {
	orgSlug: string;
	orgId: string;
	orgShortId: string;
	/** Closes the dialog (after a result is chosen). */
	onClose: () => void;
}

/**
 * The palette body, on the same `Command*` pieces as the admin palette: input, Posts and Releases groups, an always-present
 * "post it as a new idea" row and a keyboard-hint footer. Results come pre-filtered from `usePortalSearch`, so the
 * dialog's own cmdk filtering is off (`PortalSearch`). Mounted only while the dialog is open, so its state starts fresh.
 */
export function SearchPalette({ orgSlug, orgId, orgShortId, onClose }: SearchPaletteProps) {
	const navigate = useNavigate();
	const [rawQuery, setRawQuery] = useState("");
	const { posts, releases, query, isEmptyQuery, isSearching, isError } = usePortalSearch(
		orgId,
		orgSlug,
		orgShortId,
		rawQuery
	);

	// Each call site passes its own `navigate(...)` so the router can type-check that route's params.
	const go = (navigation: () => Promise<void>) => {
		onClose();
		void navigation();
	};

	const visibleCount = posts.length + releases.length;
	const isWaiting = !isEmptyQuery && isSearching && visibleCount === 0;

	return (
		<>
			<CommandInput
				placeholder="Search posts and releases"
				value={rawQuery}
				onValueChange={setRawQuery}
				badge={
					isSearching ? (
						<IconLoader2
							aria-hidden
							className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
						/>
					) : undefined
				}
			/>
			<CommandList className="max-h-[min(440px,calc(100dvh-200px))]">
				{/* Not CommandEmpty: the "new idea" row is always there, so cmdk never sees an empty list. */}
				{!isWaiting && visibleCount === 0 && !isEmptyQuery && (
					<div className="py-3 text-center text-muted-foreground text-sm">
						{isError ? "Search didn't load. Check your connection and try again." : `No results for "${query}".`}
					</div>
				)}
				{isWaiting && <div className="py-6 text-center text-muted-foreground text-sm">Searching...</div>}

				{posts.length > 0 && (
					<CommandGroup heading={isEmptyQuery ? "Popular posts" : "Posts"}>
						{posts.map((post) =>
							post.shortId == null ? null : (
								<CommandItem
									key={post.id}
									value={`post-${post.id}`}
									onSelect={() =>
										go(() =>
											navigate({
												to: "/orgs/$orgSlug/$shortId",
												params: { orgSlug, shortId: String(post.shortId) },
											})
										)
									}
								>
									<span className="hidden w-14 shrink-0 text-muted-foreground text-xs tabular-nums sm:block">
										{formatTaskKey(orgShortId, post.shortId)}
									</span>
									<span className="min-w-0 flex-1 truncate">
										<Highlight text={post.title?.trim() || "Untitled post"} query={query} />
									</span>
									<StatusChip status={post.status} className="shrink-0" />
									<span className="hidden w-10 shrink-0 items-center gap-1 text-muted-foreground text-xs tabular-nums sm:inline-flex">
										<IconChevronUp aria-hidden className="size-3.5!" stroke={2.4} />
										{formatCount(post.voteCount)}
										<span className="sr-only">{post.voteCount === 1 ? "vote" : "votes"}</span>
									</span>
								</CommandItem>
							)
						)}
					</CommandGroup>
				)}

				{releases.length > 0 && (
					<CommandGroup heading={isEmptyQuery ? "Latest releases" : "Releases"}>
						{releases.map((release) => (
							<CommandItem
								key={release.id}
								value={`release-${release.id}`}
								onSelect={() =>
									go(() =>
										navigate({
											to: "/orgs/$orgSlug/releases/$releaseSlug",
											params: { orgSlug, releaseSlug: release.slug },
										})
									)
								}
							>
								<IconRocket aria-hidden className="text-primary" stroke={1.75} />
								<span className="min-w-0 flex-1 truncate">
									<Highlight text={release.slug} query={query} />
									{release.name.trim() !== "" && release.name !== release.slug && (
										<>
											<span className="text-muted-foreground"> · </span>
											<Highlight text={release.name} query={query} />
										</>
									)}
								</span>
								<ReleaseStatusChip status={release.status} className="shrink-0" />
							</CommandItem>
						))}
					</CommandGroup>
				)}

				<CommandGroup>
					{/* Always present: carries the typed query to the new post form as `?title=`. */}
					<CommandItem value="create-post" onSelect={() => go(() => navigate(newPostLink(orgSlug, query)))}>
						<IconPlus aria-hidden className="text-muted-foreground" />
						<span className="min-w-0 flex-1 truncate text-muted-foreground">
							{query ? (
								<>
									Not here? Post <b className="font-semibold text-foreground">&quot;{query}&quot;</b> as a new
									idea
								</>
							) : (
								"Not here? Post a new idea"
							)}
						</span>
					</CommandItem>
				</CommandGroup>
			</CommandList>

			<div className="flex items-center gap-3 border-t bg-accent/50 px-3 py-2 text-muted-foreground text-xs">
				<div className="flex items-center gap-1">
					<IconArrowsUpDown className="size-3" />
					<span>Navigate</span>
				</div>
				<div className="flex items-center gap-1">
					<IconArrowBack className="size-3" />
					<span>Open</span>
				</div>
			</div>
		</>
	);
}
