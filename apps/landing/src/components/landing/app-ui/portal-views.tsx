import { IconMessageCircle, IconPlus, IconRocket } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Status } from "./atoms";
import { DEMO_TASKS, type DemoStatus, type DemoTask, ORG, PUBLIC_POSTS, PUBLIC_STATUS_LABEL } from "./demo-data";

function Votes({ count, className }: { count: number; className?: string }) {
	return (
		<span
			className={cn(
				"flex w-11 shrink-0 flex-col items-center rounded-md border py-1 text-[11px] leading-tight tabular-nums",
				className
			)}
		>
			<span aria-hidden>▲</span>
			<span className="font-semibold">{count}</span>
		</span>
	);
}

function PostRow({ task }: { task: DemoTask }) {
	return (
		<li className="flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="inline-flex w-fit items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px]">
					<Status status={task.status} size={12} /> {PUBLIC_STATUS_LABEL[task.status]}
				</span>
				<span className="truncate font-medium text-[13px]">{task.title}</span>
				<span className="flex items-center gap-3 text-[11px] text-muted-foreground">
					<span>Feature request</span>
					<span className="flex items-center gap-1">
						<IconMessageCircle className="size-3" /> {task.comments ?? 0}
					</span>
				</span>
			</div>
			<Votes count={task.votes ?? 0} />
		</li>
	);
}

/** The portal's feedback board: posts by votes, with a prompt to write one. */
export function PortalFeedback() {
	return (
		<div className="flex flex-col gap-3 p-4">
			<div className="rounded-lg border bg-card">
				<div className="flex items-center justify-between px-3 py-2.5">
					<div>
						<p className="font-medium text-[13px]">Share your feedback</p>
						<p className="text-[11px] text-muted-foreground">Ideas, bugs and requests for {ORG.name}</p>
					</div>
					<span className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
						<IconPlus className="size-3.5" /> Write a post
					</span>
				</div>
				<div className="flex gap-3 border-t px-3 text-xs">
					<span className="border-primary border-b-2 py-2 font-medium">Most voted</span>
					<span className="py-2 text-muted-foreground">Newest</span>
					<span className="py-2 text-muted-foreground">Recently updated</span>
				</div>
			</div>
			<ul className="flex flex-col gap-2">
				{PUBLIC_POSTS.filter((task) => task.status !== "done")
					.slice(0, 3)
					.map((task) => (
						<PostRow key={task.key} task={task} />
					))}
			</ul>
		</div>
	);
}

const ROADMAP_COLUMNS: { status: DemoStatus; label: string }[] = [
	{ status: "todo", label: "Planned" },
	{ status: "in-progress", label: "In progress" },
	{ status: "done", label: "Shipped" },
];

/** The portal's roadmap: public posts in columns by status. */
export function PortalRoadmap() {
	return (
		<div className="grid grid-cols-3 gap-3 p-4">
			{ROADMAP_COLUMNS.map((column) => {
				const posts = PUBLIC_POSTS.filter((task) => task.status === column.status);
				return (
					<div key={column.status} className="flex flex-col gap-2">
						<p className="flex items-center gap-2 px-1 text-xs">
							<Status status={column.status} size={14} />
							<span className="font-medium">{column.label}</span>
							<span className="text-muted-foreground">{posts.length}</span>
						</p>
						{posts.map((task) => (
							<div key={task.key} className="flex flex-col gap-2 rounded-lg border bg-card p-2.5">
								<span className="text-[13px] leading-snug">{task.title}</span>
								<span className="flex items-center justify-between text-[11px] text-muted-foreground">
									<span>Feature request</span>
									<span className="tabular-nums">▲ {task.votes}</span>
								</span>
							</div>
						))}
					</div>
				);
			})}
		</div>
	);
}

const RELEASED = DEMO_TASKS.filter((task) => ["DOR-187", "DOR-176", "DOR-181"].includes(task.key));
const UPCOMING = DEMO_TASKS.filter((task) => ["DOR-214", "DOR-209", "DOR-205"].includes(task.key));

/** The portal's changelog: the latest release with what shipped, and what's coming next. */
export function PortalChangelog() {
	const upcomingDone = UPCOMING.filter((task) => task.status === "done").length;
	const upcomingActive = UPCOMING.filter((task) => task.status === "in-progress").length;

	return (
		<div className="grid gap-3 p-4 sm:grid-cols-[1fr_13rem]">
			<div className="flex flex-col gap-3">
				<p className="text-muted-foreground text-xs">September</p>
				<article className="flex flex-col gap-3 rounded-lg border bg-card p-4">
					<div className="flex items-center gap-2">
						<IconRocket className="size-4 text-primary" />
						<p className="font-semibold">{ORG.name} 2.3</p>
						<span className="ml-auto text-muted-foreground text-xs">2.3 · 18 Sep</span>
					</div>
					<p className="text-[13px] text-muted-foreground leading-relaxed">
						Bio pages get themes, short links get custom slugs, and every link now has a UTM builder.
					</p>
					<div className="h-1.5 rounded-full bg-success" />
					<ul className="flex flex-col gap-1.5">
						{RELEASED.map((task) => (
							<li key={task.key} className="flex items-center gap-2 text-[13px]">
								<Status status="done" size={14} />
								<span className="min-w-0 flex-1 truncate">{task.title}</span>
								<span className="text-muted-foreground text-xs tabular-nums">▲ {task.votes}</span>
							</li>
						))}
					</ul>
					<p className="flex items-center gap-2 text-[11px] text-muted-foreground">
						<span className="rounded-full border bg-accent/50 px-1.5">❤️ 12</span>
						<span className="rounded-full border bg-accent/50 px-1.5">🎉 8</span>
						<span>5 comments</span>
					</p>
				</article>
			</div>
			<aside className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-[13px]">
				<p className="font-medium">Coming next</p>
				<p className="text-muted-foreground text-xs">{ORG.name} 2.4 · On track</p>
				<div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
					<span className="bg-success" style={{ width: `${(upcomingDone / UPCOMING.length) * 100}%` }} />
					<span className="bg-primary" style={{ width: `${(upcomingActive / UPCOMING.length) * 100}%` }} />
				</div>
				<ul className="mt-1 flex flex-col gap-1.5">
					{UPCOMING.map((task) => (
						<li key={task.key} className="flex items-center gap-2 text-xs">
							<Status status={task.status} size={13} />
							<span className="truncate">{task.title}</span>
						</li>
					))}
				</ul>
			</aside>
		</div>
	);
}
