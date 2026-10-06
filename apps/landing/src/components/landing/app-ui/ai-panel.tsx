import {
	IconChevronRight,
	IconLink,
	IconRefresh,
	IconRocket,
	IconSparkles,
	IconUser,
	IconX,
} from "@tabler/icons-react";
import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AppWindow } from "./app-window";
import { CategoryChip, LabelChip, Person, Priority, Status } from "./atoms";
import { DEMO_TASKS, PEOPLE, STATUS_LABEL } from "./demo-data";
import { fade, stepProgress, Swap, useReplay } from "./replay";

// The task page's AI Insights (apps/start: task-ai-insights.tsx), recreated:
// an AI Summary that streams in, then Recommendations as dashed chips. One gets
// accepted, so it leaves the list and the field updates on the task.

const TASK = DEMO_TASKS.find((task) => task.key === "DOR-230") ?? DEMO_TASKS[0];
const RELATED = DEMO_TASKS.find((task) => task.key === "DOR-198");

/** The summary as rendered markdown: plain runs and bold runs. */
const SUMMARY: { text: string; bold?: boolean }[] = [
	{ text: "Users want to " },
	{ text: "drag links into order", bold: true },
	{
		text: " on their bio page instead of editing each position. It has 23 votes, and comments ask for mobile support too. Not assigned or planned yet.",
	},
];
const SUMMARY_LENGTH = SUMMARY.reduce((total, run) => total + run.text.length, 0);

const STEPS = 5;
/** When the suggested assignee is accepted, in steps. */
const ACCEPT_AT = 4.3;

/** ContextSection's header: chevron, a tinted sparkle pill, the label, and a trailing control. */
function AiSection({ label, trailing, children }: { label: string; trailing?: ReactNode; children: ReactNode }) {
	return (
		<div className="flex flex-col">
			<div className="flex items-center gap-1">
				<span className="flex items-center gap-1 rounded-lg bg-primary/10 p-1">
					<IconChevronRight className="size-4 rotate-90 text-muted-foreground" />
					<IconSparkles className="size-3 text-primary" />
					<span className="font-medium text-foreground text-xs leading-none">{label}</span>
				</span>
				{trailing}
			</div>
			<div className="flex flex-col gap-2 py-1">{children}</div>
		</div>
	);
}

/** The streaming summary: text typed in run by run, with the app's pulsing caret. The rest keeps its space. */
function StreamedSummary({ progress }: { progress: number }) {
	let remaining = Math.round(SUMMARY_LENGTH * progress);
	const streaming = progress > 0 && progress < 1;
	return (
		<p className="text-foreground text-sm leading-normal">
			{SUMMARY.map((run) => {
				const shown = run.text.slice(0, Math.max(0, remaining));
				const hidden = run.text.slice(shown.length);
				remaining -= run.text.length;
				const Tag = run.bold ? "strong" : "span";
				return (
					<Tag key={run.text} className={cn(run.bold && "font-semibold")}>
						{shown}
						{streaming && hidden && shown.length > 0 && (
							// Zero-width anchor, so the caret never re-wraps the text.
							<span className="relative">
								<span className="absolute top-0.5 left-0.5 h-3.5 w-0.5 animate-pulse bg-foreground/60" />
							</span>
						)}
						<span className="invisible">{hidden}</span>
					</Tag>
				);
			})}
		</p>
	);
}

/** A suggestion chip: click to accept, X to dismiss. */
function SuggestionChip({ icon, children, pressed }: { icon: ReactNode; children: ReactNode; pressed?: boolean }) {
	return (
		<span
			className={cn(
				"flex max-w-64 items-center gap-1.5 rounded-2xl border border-border border-dashed bg-accent py-1 pr-1 pl-2 font-semibold text-secondary-foreground text-xs transition-transform duration-150",
				pressed && "scale-95 border-primary"
			)}
		>
			<span className="flex min-w-0 items-center gap-1.5">
				{icon}
				<span className="truncate">{children}</span>
			</span>
			<IconX size={12} className="shrink-0 text-muted-foreground" />
		</span>
	);
}

function SuggestionRow({ label, show, children }: { label: string; show: boolean; children: ReactNode }) {
	return (
		<div aria-hidden={!show} className={cn("flex flex-wrap items-center gap-2", fade(show))}>
			<span className="font-semibold text-foreground text-xs">{label}:</span>
			{children}
		</div>
	);
}

/**
 * Product tab: built-in AI on a task. Replays whenever the tab is opened, and on
 * hover; rests on the finished state (summary written, assignee accepted).
 */
export function AiPanel({ active }: { active: boolean }) {
	const { at, ref, triggers, play } = useReplay<HTMLDivElement>(STEPS);
	const accepted = at >= ACCEPT_AT;
	const summaryDone = at >= 2.5;

	useEffect(() => {
		if (active) play();
	}, [active, play]);

	if (!TASK) return null;

	return (
		<div ref={ref} {...triggers}>
			<AppWindow crumbs={["Tasks", TASK.key]} className="h-[33rem]">
				<div className="flex h-full flex-col gap-5 overflow-hidden p-5">
					<div className="flex flex-col gap-3">
						<h4 className="font-semibold text-xl!">{TASK.title}</h4>
						<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
							<span className="flex items-center gap-1.5">
								<Status status={TASK.status} /> {STATUS_LABEL[TASK.status]}
							</span>
							<span className="flex items-center gap-1.5">
								<Priority priority={TASK.priority} /> No priority
							</span>
							{TASK.labels.map((label) => (
								<LabelChip key={label.name} label={label} />
							))}
							<CategoryChip category={TASK.category} />
							<span
								className={cn(
									"flex items-center gap-1.5 rounded-md px-1 transition-colors duration-700",
									accepted && at < ACCEPT_AT + 0.6 && "bg-primary/15 text-foreground"
								)}
							>
								<Swap
									when={accepted}
									on={
										<span className="flex items-center gap-1.5">
											<Person person={PEOPLE.will} size={16} /> {PEOPLE.will.name}
										</span>
									}
									off={
										<span className="flex items-center gap-1.5">
											<IconUser className="size-3.5" /> Unassigned
										</span>
									}
								/>
							</span>
						</div>
						<p className="text-muted-foreground">
							Let me drag links into order on my bio page instead of editing every position.
						</p>
					</div>

					<div className="flex flex-col gap-3">
						<AiSection
							label="AI Summary"
							trailing={
								<span className="ml-auto flex h-6 items-center px-2 text-muted-foreground text-xs">
									<IconRefresh size={12} className="mr-1" /> Regenerate
								</span>
							}
						>
							<StreamedSummary progress={stepProgress(at, 0.2, 2.3)} />
							<p className={cn("text-xs", fade(summaryDone))}>
								AI can make mistakes{" "}
								<span className="text-muted-foreground">
									Review important information carefully. · Generated just now
								</span>
							</p>
						</AiSection>

						<AiSection label="Recommendations">
							{!accepted && (
								<SuggestionRow label="Assignees" show={at >= 2.7}>
									<SuggestionChip
										pressed={at >= ACCEPT_AT - 0.4}
										icon={<IconUser className="size-3.5 text-muted-foreground" />}
									>
										{PEOPLE.will.name}
									</SuggestionChip>
								</SuggestionRow>
							)}
							<SuggestionRow label="Priority" show={at >= 2.9}>
								<SuggestionChip icon={<Priority priority="medium" />}>Medium</SuggestionChip>
							</SuggestionRow>
							<SuggestionRow label="Release" show={at >= 3.1}>
								<SuggestionChip icon={<IconRocket className="size-3.5 text-muted-foreground" />}>
									v2.5
								</SuggestionChip>
							</SuggestionRow>
							{RELATED && (
								<SuggestionRow label="Related" show={at >= 3.3}>
									<SuggestionChip icon={<IconLink className="size-3.5 shrink-0 text-muted-foreground" />}>
										<span className="mr-1.5 font-mono text-[10px] text-muted-foreground">{RELATED.key}</span>
										{RELATED.title}
									</SuggestionChip>
								</SuggestionRow>
							)}
						</AiSection>
					</div>
				</div>
			</AppWindow>
		</div>
	);
}
