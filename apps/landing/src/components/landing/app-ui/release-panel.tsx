import { IconCircleCheck, IconGitMerge, IconRocket } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Person, Status } from "./atoms";
import { DEMO_TASKS, FEATURED_TASK, ORG, PEOPLE } from "./demo-data";

/** What v2.4 contains; the public changelog's "Coming next" lists the same tasks. */
export const RELEASE_KEYS = [FEATURED_TASK.key, "DOR-209", "DOR-205"];

interface ReleasePanelProps {
	/** True once the release is published: every task done, badge reads "Released". */
	released: boolean;
	/** Show the lead's latest status update above the task list. */
	showUpdate?: boolean;
}

/** A release in the admin app: progress from its tasks, the latest update, the tasks, and the linked PR. */
export function ReleasePanel({ released, showUpdate = false }: ReleasePanelProps) {
	const tasks = DEMO_TASKS.filter((task) => RELEASE_KEYS.includes(task.key)).map((task) =>
		released ? { ...task, status: "done" as const } : task
	);
	const done = tasks.filter((task) => task.status === "done").length;
	const inProgress = tasks.filter((task) => task.status === "in-progress").length;

	return (
		<div className="flex flex-col gap-4 p-5 text-[13px]">
			<div className="flex flex-wrap items-center gap-3">
				<span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
					<IconRocket className="size-4 text-primary" />
				</span>
				<div>
					<p className="font-semibold text-base tracking-tight">{ORG.name} 2.4</p>
					<p className="text-muted-foreground text-xs">v2.4 · Target 30 Oct</p>
				</div>
				<span
					className={cn(
						"ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
						released ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
					)}
				>
					<IconCircleCheck className="size-3.5" /> {released ? "Released" : "On track"}
				</span>
			</div>

			<div>
				<div className="flex h-2 overflow-hidden rounded-full bg-muted">
					<span
						className="bg-success transition-[width] duration-700"
						style={{ width: `${(done / tasks.length) * 100}%` }}
					/>
					<span
						className="bg-primary transition-[width] duration-700"
						style={{ width: `${(inProgress / tasks.length) * 100}%` }}
					/>
				</div>
				<p className="mt-2 text-muted-foreground text-xs">
					{done} of {tasks.length} done{inProgress > 0 && ` · ${inProgress} in progress`}
				</p>
			</div>

			{showUpdate && (
				<div className="flex flex-col gap-1.5 rounded-lg border bg-card p-3">
					<p className="flex items-center gap-2 text-xs">
						<Person person={PEOPLE.will} size={16} />
						<span className="font-medium">Will</span>
						<span className="text-muted-foreground">posted an update · 2h</span>
						<span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[11px] text-success">
							On track
						</span>
					</p>
					<p className="text-muted-foreground leading-relaxed">
						Custom domains are in testing. QR codes start this week, password links next.
					</p>
				</div>
			)}

			<div className="flex flex-col divide-y rounded-lg border">
				{tasks.map((task) => (
					<div
						key={task.key}
						className={cn(
							"flex items-center gap-3 px-3 py-2.5",
							task.key === FEATURED_TASK.key && "bg-primary/10"
						)}
					>
						<Status status={task.status} />
						<span className="w-14 shrink-0 text-muted-foreground text-xs tabular-nums">{task.key}</span>
						<span className="min-w-0 flex-1 truncate">{task.title}</span>
						{task.assignee && <Person person={task.assignee} size={18} />}
					</div>
				))}
			</div>

			<div className="flex items-center justify-between gap-3 text-xs">
				<p className="flex items-center gap-2 text-muted-foreground">
					<IconGitMerge className="size-4 text-purple-400" /> doras/app#501 merged
				</p>
				<p className="flex items-center gap-2 text-muted-foreground">
					<Person person={PEOPLE.will} size={16} /> {released ? "Published by Will" : "Will · lead"}
				</p>
			</div>
		</div>
	);
}
