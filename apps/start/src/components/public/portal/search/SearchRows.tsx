import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { formatCount, formatTaskKey } from "@repo/util";
import { IconArrowRight, IconChevronUp, IconPlus, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";
import { splitHighlight } from "@/lib/portal/search";
import { newPostLink } from "../board/new-post-path";
import type { PublicReleaseSummary } from "../board/useBoardSideData";
import { ReleaseStatusChip } from "../releases/ReleaseStatusChip";
import { StatusChip } from "../ui/StatusChip";

const ROW_CLASS =
	"mx-2 flex h-12 cursor-pointer items-center gap-3 rounded-[10px] px-4 text-portal-fg no-underline outline-none transition-colors aria-selected:bg-portal-raised";

/** Rows are links (so they can open in a new tab) acting as listbox options; a native <option> can't be a link. */
const OPTION_ATTRS = { role: "option", tabIndex: -1 } as const;

/** Keep focus in the search input when a row is pressed, so the click lands without a focus jump. */
const keepInputFocus = (event: MouseEvent) => event.preventDefault();

interface RowProps {
	/** DOM id referenced by the input's `aria-activedescendant`. */
	id: string;
	active: boolean;
	/** Called on click (the palette closes); navigation itself is the link's. */
	onSelect: () => void;
	onHover: () => void;
}

/** `<mark>` styled accent-soft + accent-ink around the part of `text` that matches the query. */
export function Highlight({ text, query }: { text: string; query: string }) {
	return (
		<>
			{splitHighlight(text, query).map((segment, index) =>
				segment.match ? (
					<mark
						// biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
						key={index}
						className="rounded-[3px] bg-portal-accent-soft px-px text-portal-accent-ink"
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

interface SearchGroupProps {
	/** Id of the heading element; the group is labelled by it. */
	headingId: string;
	heading: string;
	children: ReactNode;
}

/** A labelled group of result rows inside the listbox. */
export function SearchGroup({ headingId, heading, children }: SearchGroupProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: a group inside a listbox, not a form <fieldset>
		<div role="group" aria-labelledby={headingId}>
			<div
				id={headingId}
				className="px-6 pt-3 pb-1.5 font-semibold text-portal-fg-3 text-xs uppercase tracking-[0.04em]"
			>
				{heading}
			</div>
			{children}
		</div>
	);
}

const ArrowSlot = ({ active }: { active: boolean }) => (
	<span aria-hidden className="hidden w-4 shrink-0 text-portal-fg-3 sm:block">
		{active && <IconArrowRight className="size-4" />}
	</span>
);

interface PostRowProps extends RowProps {
	post: schema.TaskWithLabels;
	orgSlug: string;
	orgShortId: string;
	query: string;
}

/** Key, title (highlighted), status chip and vote count; opens `/orgs/$orgSlug/$shortId`. */
export function PostRow({ post, orgSlug, orgShortId, query, id, active, onSelect, onHover }: PostRowProps) {
	if (post.shortId == null) return null;
	const title = post.title?.trim() || "Untitled post";

	return (
		<Link
			to="/orgs/$orgSlug/$shortId"
			params={{ orgSlug, shortId: String(post.shortId) }}
			{...OPTION_ATTRS}
			id={id}
			aria-selected={active}
			onMouseDown={keepInputFocus}
			onClick={onSelect}
			onPointerMove={onHover}
			className={ROW_CLASS}
		>
			<span className="hidden min-w-[58px] shrink-0 text-center text-[13px] text-portal-fg-3 tabular-nums sm:block">
				{formatTaskKey(orgShortId, post.shortId)}
			</span>
			<span className="min-w-0 flex-1 truncate font-medium text-[14.5px]">
				<Highlight text={title} query={query} />
			</span>
			<StatusChip status={post.status} className="shrink-0" />
			<span className="hidden w-[38px] shrink-0 items-center gap-1 text-[13px] text-portal-fg-2 tabular-nums sm:inline-flex">
				<IconChevronUp aria-hidden className="size-3.5" stroke={2.4} />
				{formatCount(post.voteCount)}
				<span className="sr-only">{post.voteCount === 1 ? "vote" : "votes"}</span>
			</span>
			<ArrowSlot active={active} />
		</Link>
	);
}

interface ReleaseRowProps extends RowProps {
	release: PublicReleaseSummary;
	orgSlug: string;
	query: string;
}

/** Version (slug) + name (highlighted) and status chip; opens `/orgs/$orgSlug/releases/$releaseSlug`. */
export function ReleaseRow({ release, orgSlug, query, id, active, onSelect, onHover }: ReleaseRowProps) {
	const showName = release.name.trim() !== "" && release.name !== release.slug;

	return (
		<Link
			to="/orgs/$orgSlug/releases/$releaseSlug"
			params={{ orgSlug, releaseSlug: release.slug }}
			{...OPTION_ATTRS}
			id={id}
			aria-selected={active}
			onMouseDown={keepInputFocus}
			onClick={onSelect}
			onPointerMove={onHover}
			className={ROW_CLASS}
		>
			<span aria-hidden className="hidden w-[58px] shrink-0 justify-center text-portal-accent-ink sm:flex">
				<IconRocket className="size-[18px]" stroke={1.75} />
			</span>
			<span className="min-w-0 flex-1 truncate font-medium text-[14.5px]">
				<Highlight text={release.slug} query={query} />
				{showName && (
					<>
						<span className="text-portal-fg-3"> · </span>
						<Highlight text={release.name} query={query} />
					</>
				)}
			</span>
			<ReleaseStatusChip status={release.status} className="shrink-0" />
			<span aria-hidden className="hidden w-[54px] shrink-0 sm:block" />
		</Link>
	);
}

interface CreateRowProps extends RowProps {
	orgSlug: string;
	query: string;
}

/** The always-last row: carries the typed query to the new post form as `?title=`. */
export function CreateRow({ orgSlug, query, id, active, onSelect, onHover }: CreateRowProps) {
	return (
		<Link
			{...newPostLink(orgSlug, query)}
			{...OPTION_ATTRS}
			id={id}
			aria-selected={active}
			onMouseDown={keepInputFocus}
			onClick={onSelect}
			onPointerMove={onHover}
			className={cn(ROW_CLASS, "text-portal-fg-2")}
		>
			<span aria-hidden className="hidden w-[58px] shrink-0 justify-center text-portal-fg-2 sm:flex">
				<IconPlus className="size-[18px]" />
			</span>
			<span className="min-w-0 flex-1 truncate text-[14.5px]">
				{query ? (
					<>
						Not here? Post <b className="font-semibold text-portal-fg">&quot;{query}&quot;</b> as a new idea
					</>
				) : (
					"Not here? Post a new idea"
				)}
			</span>
			<ArrowSlot active={active} />
		</Link>
	);
}
