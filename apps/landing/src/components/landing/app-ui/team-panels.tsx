import { IconDots, IconLock, IconPencil, IconTrash, IconWorld } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Person, Status } from "./atoms";
import { Comment } from "./comment";
import { DEMO_TASKS, PEOPLE, VISITORS } from "./demo-data";
import { fade, type ReplayProps, Swap } from "./replay";

// Small recreations for the homepage "Built for real teams" strip: team
// permissions (apps/start team-settings.tsx), comment moderation, and
// internal-vs-public on one task. Each is a short script driven by `at`.

/** The app's Switch, at the size the settings rows use. */
function Toggle({ on }: { on: boolean }) {
	return (
		<span
			className={cn(
				"inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-300",
				on ? "bg-primary" : "bg-input"
			)}
		>
			<span
				className={cn(
					"block size-4 rounded-full bg-background shadow-lg transition-transform duration-300",
					on ? "translate-x-4" : "translate-x-0"
				)}
			/>
		</span>
	);
}

/** Team settings' PermissionRow: label, description, switch, tinted when on. */
function PermissionRow({ label, description, on }: { label: string; description: string; on: boolean }) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 rounded-lg p-2.5 transition-colors duration-300",
				on && "bg-primary/5"
			)}
		>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="font-medium text-[13px]">{label}</span>
				<span className="truncate text-muted-foreground text-xs">{description}</span>
			</span>
			<Toggle on={on} />
		</div>
	);
}

export const PERMISSIONS_STEPS = 3;

/** A "Moderators" team getting its permissions switched on, one by one. */
export function PermissionsPanel({ at }: ReplayProps) {
	return (
		<div className="flex flex-col gap-1 rounded-xl border bg-card p-2 text-[13px]">
			<div className="flex items-center justify-between px-2.5 py-1.5">
				<span className="font-semibold">Moderators</span>
				<span className="flex -space-x-1">
					<Person person={PEOPLE.trent} size={18} />
					<Person person={PEOPLE.will} size={18} />
				</span>
			</div>
			<PermissionRow label="Manage comments" description="Edit or delete any comment" on={at >= 0.6} />
			<PermissionRow label="Manage labels" description="Create, edit, and delete task labels" on={at >= 1.4} />
			<PermissionRow
				label="Manage members"
				description="Invite, remove, and manage organization members"
				on={false}
			/>
		</div>
	);
}

const SPAMMER = { name: "growthhacks", initials: "GH", color: "#71717a" };

export const MODERATION_STEPS = 3;

/**
 * A spam comment on a public post: a moderator opens its menu, deletes it, and
 * the thread closes up. The box has a fixed height, so the card doesn't move.
 */
export function ModerationPanel({ at }: ReplayProps) {
	const menuOpen = at >= 0.6 && at < 2;
	const deleting = at >= 1.3;
	const deleted = at >= 2;
	return (
		<div className="flex h-56 flex-col gap-2 overflow-hidden rounded-xl border bg-card p-3 text-[13px]">
			<span className="text-muted-foreground text-xs">Themes for bio pages · 4 comments</span>
			<Comment
				comment={{
					id: "jordan",
					author: VISITORS.jordan,
					text: "Love the new themes!",
				}}
			/>
			<div
				className={cn(
					"grid transition-[grid-template-rows,opacity] duration-500 motion-reduce:transition-none",
					deleted ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
				)}
			>
				<div className="relative min-h-0">
					<div className={cn("rounded-lg transition-colors", menuOpen && "bg-destructive/5")}>
						<Comment
							comment={{
								id: "spam",
								author: SPAMMER,
								text: "Cheap bio page visits, DM me!!",
							}}
						/>
					</div>
					<IconDots className="absolute top-0 right-1 size-4 text-muted-foreground" />
					<div
						className={cn(
							"absolute top-5 right-1 flex w-40 flex-col rounded-lg border bg-popover p-1 text-xs shadow-lg",
							fade(menuOpen)
						)}
					>
						<span className="flex items-center gap-2 rounded-md px-2 py-1.5">
							<IconPencil className="size-3.5" /> Edit
						</span>
						<span
							className={cn(
								"flex items-center gap-2 rounded-md px-2 py-1.5 text-destructive transition-colors",
								deleting && "bg-destructive/10"
							)}
						>
							<IconTrash className="size-3.5" /> Delete
						</span>
					</div>
				</div>
			</div>
			<Comment
				comment={{
					id: "tom",
					author: PEOPLE.tom,
					team: true,
					text: "Custom fonts are next on the roadmap.",
				}}
			/>
		</div>
	);
}

const VISIBILITY_TASK = DEMO_TASKS.find((task) => task.key === "DOR-205");

export const VISIBILITY_STEPS = 3;

/**
 * One task, two audiences: it's made public, a visitor comments, and the team
 * replies internally in the same thread.
 */
export function VisibilityPanel({ at }: ReplayProps) {
	const isPublic = at >= 0.8;
	if (!VISIBILITY_TASK) return null;
	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-card p-3 text-[13px]">
			<div className="flex items-center gap-2">
				<Status status={VISIBILITY_TASK.status} />
				<span className="shrink-0 text-muted-foreground text-xs">{VISIBILITY_TASK.key}</span>
				<span className="truncate font-medium">{VISIBILITY_TASK.title}</span>
				<span
					className={cn(
						"ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[11px] transition-colors duration-300",
						isPublic ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
					)}
				>
					<Swap
						when={isPublic}
						on={
							<span className="flex items-center gap-1">
								<IconWorld className="size-3" /> Public
							</span>
						}
						off={
							<span className="flex items-center gap-1">
								<IconLock className="size-3" /> Private
							</span>
						}
					/>
				</span>
			</div>
			<div className={fade(at >= 1.4)}>
				<Comment comment={{ id: "priya", author: VISITORS.priya, text: "We'd use this for every client link." }} />
			</div>
			<div className={fade(at >= 2.1)}>
				<Comment
					comment={{
						id: "trent",
						author: PEOPLE.trent,
						internal: true,
						text: "Needs the new hashing lib first, I'll pair on it.",
					}}
				/>
			</div>
		</div>
	);
}
