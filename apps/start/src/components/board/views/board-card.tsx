import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Checkbox } from "@repo/ui/components/checkbox";
import { cn } from "@repo/ui/lib/utils";
import { formatTaskKey, getInitials } from "@repo/util";
import { IconChevronUp } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";
import { useTaskSelection } from "@/hooks/useTaskSelection";
import { useBoardCapabilities } from "../core/board-data";
import { BoardTaskContextMenu } from "../fields/board-task-context-menu";
import { type BoardField, FieldToolbar } from "../fields/field-toolbar";
import { BOARD_TASK_SELECTION_KEY } from "../selection/board-selection-constants";

/** Where the card links: the admin task page (default) or a public post. */
export type BoardCardLink =
	| { to: "/$orgId/tasks/$taskShortId"; params: { orgId: string; taskShortId: string } }
	| { to: "/orgs/$orgSlug/$shortId"; params: { orgSlug: string; shortId: string } };

const ADMIN_FIELDS: BoardField[] = ["priority", "category", "release", "label", "assignee"];

interface BoardCardProps {
	task: schema.TaskWithLabels;
	/** Overrides the admin task link (the public roadmap links to the post). */
	link?: BoardCardLink;
	/** Runs on the link's click (the public roadmap opens the post in its side panel). */
	onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
	/**
	 * Replaces the org/task-key line above the title (the public roadmap shows the category there). `null` drops the
	 * line altogether.
	 */
	header?: ReactNode;
	/** The field chips. @default priority, category, release, label, assignee */
	fields?: BoardField[];
	/** Replaces the read-only vote count at the bottom right (the public roadmap's vote button). */
	vote?: ReactNode;
	/** Marks the card as the one open in a side panel. */
	selected?: boolean;
}

/**
 * A single kanban card — org badge, task key, title, and the field toolbar
 * for inline editing. Same link/data shape as BoardRow, laid out vertically.
 * Same multi-select checkbox (hover/selected reveal) and right-click context
 * menu as BoardRow, sharing the same selection state (see
 * selection/board-selection-constants.ts) so switching list/kanban doesn't
 * lose a selection.
 */
export function BoardCard({
	task,
	link,
	onLinkClick,
	header,
	fields = ADMIN_FIELDS,
	vote,
	selected: open = false,
}: BoardCardProps) {
	const { canSelect } = useBoardCapabilities();
	const { isSelected, toggleTask } = useTaskSelection(undefined, BOARD_TASK_SELECTION_KEY);
	const selected = isSelected(task.id);
	const cardLink: BoardCardLink = link ?? {
		to: "/$orgId/tasks/$taskShortId",
		params: { orgId: task.organizationId, taskShortId: (task.shortId ?? task.id).toString() },
	};

	// The whole card is the link (like BoardRow); clicks on interactive pieces marked `data-no-propagate` (field
	// pickers, the checkbox, the vote) don't open the task.
	const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if ((event.target as HTMLElement).closest("[data-no-propagate]")) {
			event.preventDefault();
			return;
		}
		onLinkClick?.(event);
	};

	return (
		<BoardTaskContextMenu task={task}>
			<Link
				{...cardLink}
				onClick={handleLinkClick}
				className={cn(
					"group relative flex flex-col gap-2 rounded-xl bg-card p-3 hover:bg-accent transition-all",
					open && "bg-accent",
					selected && "bg-primary/10 hover:bg-primary/10"
				)}
			>
				{canSelect && (
					<Checkbox
						data-no-propagate
						checked={selected}
						onCheckedChange={(checked) => toggleTask(task.id, checked === true)}
						onClick={(event) => event.stopPropagation()}
						className={cn(
							"absolute top-2 right-2 size-3.5 rounded-md opacity-0 group-hover:opacity-100 data-checked:opacity-100 transition-all"
						)}
					/>
				)}
				<div className="flex flex-col gap-1.5">
					{header === undefined ? (
						<div className="flex items-center gap-2 pr-5">
							{task.organization && (
								<Avatar className="size-4 shrink-0">
									<AvatarImage src={task.organization.logo ?? undefined} alt={task.organization.name} />
									<AvatarFallback className="text-[9px]">{getInitials(task.organization.name)}</AvatarFallback>
								</Avatar>
							)}
							<span className="text-xs text-muted-foreground tabular-nums">
								{task.organization ? formatTaskKey(task.organization.shortId, task.shortId) : task.shortId}
							</span>
						</div>
					) : (
						header !== null && <div className="flex items-center gap-2 pr-5">{header}</div>
					)}
					<p
						className={cn(
							"text-sm font-medium line-clamp-2",
							(task.status === "done" || task.status === "canceled") && "text-muted-foreground line-through"
						)}
					>
						{task.title || "Untitled"}
					</p>
				</div>
				<div className="flex items-end justify-between gap-2">
					<FieldToolbar task={task} fields={fields} />
					{vote ? (
						<span data-no-propagate className="shrink-0">
							{vote}
						</span>
					) : (
						<BoardCardVotes count={task.voteCount ?? 0} />
					)}
				</div>
			</Link>
		</BoardTaskContextMenu>
	);
}

/** The card's read-only vote count. */
function BoardCardVotes({ count }: { count: number }) {
	return (
		<span
			className="flex h-5 shrink-0 items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums"
			title={`${count} ${count === 1 ? "vote" : "votes"}`}
		>
			<IconChevronUp className="size-3" aria-hidden />
			{count}
		</span>
	);
}
