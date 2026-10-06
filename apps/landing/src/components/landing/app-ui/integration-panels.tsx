import {
	IconBrandGithub,
	IconCheck,
	IconGitBranch,
	IconGitMerge,
	IconGitPullRequest,
	IconLoader2,
	IconSend,
	IconWorld,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OrgMark, Person, Status } from "./atoms";
import { DEMO_TASKS, FEATURED_TASK, ORG, PEOPLE, PUBLIC_STATUS_LABEL } from "./demo-data";
import { fade, type ReplayProps, Reveal, stepProgress, Swap, Typed } from "./replay";
import { Dim, Terminal } from "./terminal";

// Small recreations for the homepage integrations section. Each one shows what
// the integration really does (see docs/integrations/* and packages/cli), using
// the same Doras demo workspace as the rest of the page. Each is a short script
// driven by `at` (see `useReplay`): it runs from 0 to the panel's step count
// and rests on the finished state.

const BRANCH = `${FEATURED_TASK.key.toLowerCase()}-custom-domains`;

function TimelineRow({ icon, show, children }: { icon: ReactNode; show: boolean; children: ReactNode }) {
	return (
		<li aria-hidden={!show} className={cn("flex items-start gap-2.5", fade(show))}>
			<span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground">{icon}</span>
			<span className="text-muted-foreground">{children}</span>
		</li>
	);
}

export const GITHUB_STEPS = 4;

/**
 * GitHub: a pull request on the left; the Sayr task it closes on the right.
 * The branch name links them, merging moves the task to Done, and the public
 * post shows it as shipped.
 */
export function GithubPanel({ at }: ReplayProps) {
	const merged = at >= 2;
	const pressing = at >= 1.5 && at < 2;
	return (
		<div className="grid gap-3 text-[13px] sm:grid-cols-2">
			<div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
				<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<IconBrandGithub className="size-4" /> dorasto/doras
				</span>
				<p className="font-semibold text-[15px] leading-snug">
					{FEATURED_TASK.title} <span className="font-normal text-muted-foreground">#482</span>
				</p>
				<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-white transition-colors duration-300",
							merged ? "bg-[#8250df]" : "bg-[#1f883d]"
						)}
					>
						<Swap
							when={merged}
							on={
								<span className="flex items-center gap-1">
									<IconGitMerge className="size-3.5" /> Merged
								</span>
							}
							off={
								<span className="flex items-center gap-1">
									<IconGitPullRequest className="size-3.5" /> Open
								</span>
							}
						/>
					</span>
					<span>
						into main from <code className="rounded bg-secondary px-1 py-0.5 font-mono">{BRANCH}</code>
					</span>
				</div>
				<div className="flex flex-col gap-2 rounded-lg border bg-background p-3 font-mono text-xs">
					<span>Adds custom domains for short links.</span>
					<span className="text-primary">Fixes {FEATURED_TASK.key}</span>
				</div>
				<Swap
					when={merged}
					on={
						<span className="flex h-7 items-center gap-1.5 text-muted-foreground text-xs">
							<IconGitMerge className="size-4 shrink-0 text-[#8250df]" /> Pull request successfully merged
						</span>
					}
					off={
						<span
							className={cn(
								"inline-flex h-7 w-fit items-center rounded-md bg-[#1f883d] px-3 font-medium text-white text-xs transition-transform",
								pressing && "scale-95 brightness-90"
							)}
						>
							Merge pull request
						</span>
					}
				/>
			</div>

			<div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
				<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<OrgMark /> {ORG.name} <span aria-hidden>›</span> {FEATURED_TASK.key}
				</span>
				<p className="flex items-center gap-2 font-semibold text-[15px] leading-snug">
					<Status status={merged ? "done" : "in-progress"} />
					{FEATURED_TASK.title}
				</p>
				<ol className="flex flex-col gap-2.5 text-xs">
					<TimelineRow show={at >= 0.3} icon={<IconGitBranch className="size-4" />}>
						Linked branch <code className="font-mono text-foreground">{BRANCH}</code>
					</TimelineRow>
					<TimelineRow show={at >= 0.9} icon={<IconGitPullRequest className="size-4" />}>
						Linked pull request <span className="text-foreground">#482</span>
					</TimelineRow>
					<TimelineRow show={merged} icon={<IconGitMerge className="size-4" />}>
						Pull request merged, status set to <span className="text-foreground">Done</span>
					</TimelineRow>
					<TimelineRow show={at >= 3} icon={<IconWorld className="size-4 text-success" />}>
						Public post now shows <span className="font-medium text-success">{PUBLIC_STATUS_LABEL.done}</span>
					</TimelineRow>
				</ol>
			</div>
		</div>
	);
}

function DiscordAvatar({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<span
			className={cn(
				"flex size-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm text-white",
				className
			)}
		>
			{children}
		</span>
	);
}

function DiscordBotName() {
	return (
		<span className="flex items-center gap-1.5">
			<span className="font-medium text-white">Sayr</span>
			<span className="rounded bg-[#5865f2] px-1 font-semibold text-[10px] text-white">APP</span>
		</span>
	);
}

export const DISCORD_STEPS = 4;

/**
 * Discord: someone runs `/sayr create`, the bot replies with a link to the new
 * task, then posts it to the team's channel and edits that post as it moves.
 */
export function DiscordPanel({ at }: ReplayProps) {
	const title = "Short links 404 on custom domains";
	const typing = stepProgress(at, 0.1, 0.8);
	const moved = at >= 3;
	return (
		<div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#313338] p-4 text-[13px] text-[#dbdee1]">
			<Reveal show={at >= 1} className="flex flex-col gap-1">
				<span className="flex items-center gap-1.5 pl-12 text-[#949ba4] text-xs">
					<Person person={PEOPLE.will} size={16} />
					<span className="text-[#c9cdfb]">{PEOPLE.will.name}</span> used
					<span className="text-[#c9cdfb]">/sayr create</span>
				</span>
				<div className="flex gap-3">
					<DiscordAvatar className="bg-primary">S</DiscordAvatar>
					<div className="flex min-w-0 flex-col gap-0.5">
						<DiscordBotName />
						<span>Your task has been created!</span>
						<span>
							Title: <strong className="text-white">{title}</strong>
						</span>
						<span>
							View it here: <span className="text-[#00a8fc]">{ORG.portal}</span>
						</span>
					</div>
				</div>
			</Reveal>

			<Reveal show={at >= 2} className="flex gap-3">
				<DiscordAvatar className="bg-primary">S</DiscordAvatar>
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<DiscordBotName />
					<div className="flex flex-col gap-2 rounded border-primary border-l-4 bg-[#2b2d31] p-3">
						<span className="font-semibold text-white">{title}</span>
						<div className="grid grid-cols-2 gap-2 text-xs">
							<span className="flex flex-col">
								<span className="font-semibold text-white">Status</span>
								<Swap
									when={moved}
									on={
										<span className="text-white">
											In Progress <span className="text-[#949ba4] text-[10px]">(edited)</span>
										</span>
									}
									off="Backlog"
								/>
							</span>
							<span className="flex flex-col">
								<span className="font-semibold text-white">Priority</span>
								High
							</span>
						</div>
					</div>
				</div>
			</Reveal>

			<div className="rounded-lg bg-[#383a40] px-3 py-2 text-[#949ba4]">
				<Swap
					when={typing > 0 && typing < 1}
					on={
						<span className="text-[#dbdee1]">
							<Typed text="/sayr create" progress={typing} />
						</span>
					}
					off="Message #feedback"
				/>
			</div>
		</div>
	);
}

export const CLI_STEPS = 4;

/** The `sayr` CLI: two commands typed out, each followed by its output. */
export function CliPanel({ at }: ReplayProps) {
	return (
		<Terminal title="~/doras" className="text-xs">
			<Dim>$ </Dim>
			<Typed text={`sayr task create "QR code export"`} progress={stepProgress(at, 0, 0.9)} />
			{"\n"}
			<span className={fade(at >= 1.1)}>
				<span className="text-success">✓</span> Created <strong>QR code export</strong>
			</span>
			{"\n\n"}
			<Dim>$ </Dim>
			<Typed text="sayr task update 209 --status done" progress={stepProgress(at, 1.6, 1)} />
			{"\n"}
			<span className={fade(at >= 3)}>
				<span className="text-success">✓</span> Updated <strong>QR code for every short link</strong>
			</span>
		</Terminal>
	);
}

export const SDK_STEPS = 3;

/** `@sayrio/public`: list public tasks, then live updates arrive over SSE. */
export function SdkPanel({ at }: ReplayProps) {
	return (
		<Terminal title="roadmap.ts" className="text-xs">
			<span className="text-[#c792ea]">import</span> Sayr <span className="text-[#c792ea]">from</span>{" "}
			<span className="text-[#c3e88d]">"@sayrio/public"</span>;{"\n\n"}
			<Dim>{"// Your public tasks"}</Dim>
			{"\n"}
			<span className="text-[#c792ea]">const</span> tasks = <span className="text-[#c792ea]">await</span> Sayr.org
			{"\n  "}.tasks.<span className="text-[#82aaff]">list</span>(<span className="text-[#c3e88d]">"doras"</span>);
			{"\n\n"}
			<Dim>{"// Live updates as they change"}</Dim>
			{"\n"}
			Sayr.<span className="text-[#82aaff]">sse</span>(eventsUrl, {"{"}
			{"\n  "}[Sayr.EVENTS.UPDATE_TASK]: render,{"\n"}
			{"}"});{"\n\n"}
			<span className={fade(at >= 1)}>
				<span className="text-success">●</span> DOR-209 <Dim>→</Dim> In progress
			</span>
			{"\n"}
			<span className={fade(at >= 2)}>
				<span className="text-success">●</span> DOR-214 <Dim>→</Dim> Shipped
			</span>
		</Terminal>
	);
}

const AGENT_TASKS = DEMO_TASKS.filter((task) => task.status !== "done").slice(0, 3);
const AGENT_PICK = AGENT_TASKS.length - 1;

export const AGENT_STEPS = 4;

/**
 * The Paseo plugin: the pointer moves down the board, picks a task and sends
 * it to a coding agent.
 */
export function AgentPanel({ at }: ReplayProps) {
	const hovered = Math.min(AGENT_PICK, Math.floor(at * AGENT_TASKS.length));
	const pressing = at >= 1.5 && at < 2;
	return (
		<div className="flex flex-col overflow-hidden rounded-xl border bg-card text-[13px]">
			<span className="flex items-center gap-1.5 border-b px-3 py-2 font-medium text-muted-foreground text-xs">
				<OrgMark /> {ORG.name} tasks
			</span>
			<ul className="flex flex-col p-1">
				{AGENT_TASKS.map((task, index) => (
					<li
						key={task.key}
						className={cn(
							"flex h-8 items-center gap-2 rounded-md px-2 transition-colors duration-200",
							index === hovered && "bg-accent"
						)}
					>
						<Status status={task.status} />
						<span className="shrink-0 text-muted-foreground text-xs">{task.key}</span>
						<span className="truncate">{task.title}</span>
						{index === AGENT_PICK && at >= 1 && (
							<span
								className={cn(
									"ml-auto inline-flex w-28 shrink-0 items-center justify-center gap-1 rounded-md px-2 py-0.5 font-medium text-xs transition-[transform,background-color] duration-200",
									at < 2 && "bg-primary text-primary-foreground",
									at >= 2 && at < 3 && "bg-secondary text-secondary-foreground",
									at >= 3 && "bg-success/15 text-success",
									pressing && "scale-95"
								)}
							>
								{at < 2 && <IconSend className="size-3.5" />}
								{at >= 2 && at < 3 && <IconLoader2 className="size-3.5 animate-spin" />}
								{at >= 3 && <IconCheck className="size-3.5" />}
								{at < 2 ? "Send to agent" : at < 3 ? "Sending" : "With agent"}
							</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
