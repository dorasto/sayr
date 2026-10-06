import { IconPlayerPauseFilled, IconPlayerPlayFilled } from "@tabler/icons-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppWindow } from "../app-ui/app-window";
import { BoardList } from "../app-ui/board-views";
import type { DemoComment } from "../app-ui/comment";
import { DEMO_TASKS, type DemoStatus, FEATURED_TASK, PEOPLE, VISITORS } from "../app-ui/demo-data";
import { Layer } from "../app-ui/layer";
import { PortalPost, type PostComment } from "../app-ui/portal-post";
import { ReleasePanel } from "../app-ui/release-panel";
import { ReleasePublic } from "../app-ui/release-public";

/** How long each beat lasts; the whole loop is BEAT_MS × BEATS.length. */
const BEAT_MS = 4000;
const TICK_MS = 100;

const BEATS = [
	{ label: "Collect", caption: "Users post ideas and vote on your public board." },
	{ label: "Triage", caption: "Your team picks it up and replies in public." },
	{
		label: "Debug",
		caption: "The team debugs it in internal comments, right on the post. Only members can see them.",
	},
	{ label: "Update", caption: "Once it's fixed, one public reply tells everyone it's coming in v2.4." },
	{ label: "Release", caption: "Ship the release. Users see what changed and leave their thanks." },
] as const;

const LOOP_MS = BEAT_MS * BEATS.length;

/** A comment plus when it appears (`at`, in beats: 2.5 = halfway through Debug) and how far its reactions climb. */
interface Scripted extends Omit<DemoComment, "reactions"> {
	at: number;
	reactions?: { emoji: string; target: number }[];
}

const SAM: Scripted = {
	id: "sam",
	author: VISITORS.sam,
	text: "Our short links would look so much more trustworthy.",
	at: 0.3,
	reactions: [{ emoji: "👍", target: 6 }],
};
const PRIYA: Scripted = {
	id: "priya",
	author: VISITORS.priya,
	text: "+1, we'd move our whole team over for this.",
	at: 0.6,
};
const TOM_REPLY: Scripted = {
	id: "tom-reply",
	author: PEOPLE.tom,
	team: true,
	text: "Thanks all, we're looking into this now.",
	at: 1.4,
};
const TRENT_REPRO: Scripted = {
	id: "trent-repro",
	author: PEOPLE.trent,
	internal: true,
	text: "Repro'd: the DNS check fails for apex domains. Fix is up in #512.",
	at: 2.15,
};
const WILL_TEST: Scripted = {
	id: "will-test",
	author: PEOPLE.will,
	internal: true,
	text: "Your test still mocks the old resolver, so it passes locally and fails in CI.",
	at: 2.45,
	reactions: [{ emoji: "👀", target: 2 }],
};
const TRENT_FIXED: Scripted = {
	id: "trent-fixed",
	author: PEOPLE.trent,
	internal: true,
	text: "Good catch, test fixed and CI is green.",
	at: 2.75,
	reactions: [{ emoji: "🙌", target: 3 }],
};
const WILL_ANNOUNCE: Scripted = {
	id: "will-announce",
	author: PEOPLE.will,
	team: true,
	text: "Fixed, and it's coming in v2.4.",
	at: 3.3,
	reactions: [{ emoji: "🎉", target: 9 }],
};

/**
 * The post's conversation as a signed-in team member sees it on the portal:
 * public comments plus the internal ones (visitors only see the public ones).
 */
const POST_THREAD = [SAM, PRIYA, TOM_REPLY, TRENT_REPRO, WILL_TEST, TRENT_FIXED, WILL_ANNOUNCE];
/** Comments on the published release. */
const RELEASE_THREAD: Scripted[] = [
	{
		id: "r-sam",
		author: VISITORS.sam,
		text: "Thank you! Already moved our links over.",
		at: 4.25,
		reactions: [{ emoji: "❤️", target: 5 }],
	},
	{
		id: "r-jordan",
		author: VISITORS.jordan,
		text: "Works perfectly with our domain.",
		at: 4.5,
		reactions: [{ emoji: "🚀", target: 3 }],
	},
	{ id: "r-priya", author: VISITORS.priya, text: "This made our week.", at: 4.75 },
];

/** Tasks on the hero's board: few enough that the followed task is always on screen. */
const HERO_KEYS = [FEATURED_TASK.key, "DOR-221", "DOR-209", "DOR-198", "DOR-230"];
const BOARD_GROUPS: DemoStatus[] = ["in-progress", "todo", "backlog"];
const FEATURED_STATUS: DemoStatus[] = ["backlog", "in-progress", "in-progress", "in-progress", "done"];
const POST_DETAIL = [null, "Tom is on it", "Tom is on it", "Coming in v2.4", "Shipped in v2.4"];
/** The chip on the followed task's board row at each beat. */
const ROW_NOTE = [null, null, "#512", "#512", null];
/** Vote count at the start of each beat (and the end of the loop). */
const VOTE_MARKS = [128, 142, 146, 149, 153, 153];

/** Reads a per-beat value. Beats are always in range; the check only satisfies noUncheckedIndexedAccess. */
function forBeat<T>(values: readonly T[], beat: number): T {
	const value = values[beat];
	if (value === undefined) throw new Error(`No value for beat ${beat}`);
	return value;
}

function votesAt(position: number) {
	const beat = Math.min(Math.floor(position), BEATS.length - 1);
	const t = Math.min(position - beat, 1);
	const from = forBeat(VOTE_MARKS, beat);
	return Math.round(from + (forBeat(VOTE_MARKS, beat + 1) - from) * t);
}

/** Reveals scripted comments up to `position`; reactions count up after their comment appears. */
function reveal(thread: Scripted[], position: number): PostComment[] {
	return thread.map(({ at, reactions, ...comment }) => ({
		visible: position >= at,
		comment: {
			...comment,
			reactions: reactions?.map(({ emoji, target }) => ({
				emoji,
				count: Math.max(1, Math.min(target, Math.ceil((position - at) * 8))),
			})),
		},
	}));
}

function subscribeReducedMotion(onChange: () => void) {
	const query = window.matchMedia("(prefers-reduced-motion: reduce)");
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

/** Respects the visitor's reduced-motion setting (false on the server). */
function usePrefersReducedMotion() {
	return useSyncExternalStore(
		subscribeReducedMotion,
		() => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		() => false
	);
}

/**
 * The hero's product demo: one feature request followed from a public idea to
 * a shipped release, with the team's app and the public portal together. A
 * single clock drives it all (rows slide between groups, votes and reactions
 * climb, comments arrive, views cross-fade in place), so it plays as one
 * continuous animation. Visitors can jump to a beat, pause, or upvote.
 * Reduced motion: no clock; each beat shows its finished state.
 */
export function LoopDemo() {
	const reducedMotion = usePrefersReducedMotion();
	const [elapsed, setElapsed] = useState(0);
	const [paused, setPaused] = useState(false);
	const [voted, setVoted] = useState(false);

	useEffect(() => {
		if (paused || reducedMotion) return;
		const id = window.setInterval(() => setElapsed((value) => (value + TICK_MS) % LOOP_MS), TICK_MS);
		return () => window.clearInterval(id);
	}, [paused, reducedMotion]);

	const beat = Math.floor(elapsed / BEAT_MS);
	const progress = reducedMotion ? 0.999 : (elapsed % BEAT_MS) / BEAT_MS;
	const position = beat + progress;
	const votes = votesAt(position) + (voted ? 1 : 0);
	const current = forBeat(BEATS, beat);
	const rowNote = forBeat(ROW_NOTE, beat);

	const tasks = DEMO_TASKS.filter((task) => HERO_KEYS.includes(task.key)).map((task) =>
		task.key === FEATURED_TASK.key
			? {
					...task,
					status: forBeat(FEATURED_STATUS, beat),
					assignee: beat >= 1 ? PEOPLE.tom : undefined,
					// Planned into v2.4 once the team replies (the release badge appears on the row).
					release: beat >= 3 ? "v2.4" : undefined,
				}
			: task
	);

	return (
		<section aria-label="Product demo" className="flex flex-col gap-4">
			<div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
				<AppWindow
					active={beat < 4 ? "tasks" : "releases"}
					crumbs={beat < 4 ? ["Tasks"] : ["Releases", "v2.4"]}
					toolbar={beat < 4 ? `${tasks.length} tasks` : undefined}
					className="h-[28rem]"
				>
					<div className="grid">
						<Layer active={beat < 4}>
							<BoardList
								tasks={tasks}
								groups={BOARD_GROUPS}
								highlightKey={FEATURED_TASK.key}
								showBadges={false}
								highlightNote={
									<span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[11px] text-primary tabular-nums">
										▲ {votes}
										{rowNote && ` · ${rowNote}`}
									</span>
								}
							/>
						</Layer>
						<Layer active={beat === 4}>
							<ReleasePanel released />
						</Layer>
					</div>
				</AppWindow>
				<div className="relative z-10 grid lg:mt-8 lg:-ml-28">
					<Layer active={beat < 4}>
						<PortalPost
							status={forBeat(FEATURED_STATUS, beat)}
							votes={votes - (voted ? 1 : 0)}
							voted={voted}
							onVote={() => setVoted((value) => !value)}
							detail={forBeat(POST_DETAIL, beat) ?? undefined}
							comments={reveal(POST_THREAD, position)}
						/>
					</Layer>
					<Layer active={beat === 4}>
						<ReleasePublic featuredVotes={votes} comments={reveal(RELEASE_THREAD, position)} />
					</Layer>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<div className="flex flex-1 gap-1.5">
					{BEATS.map((item, i) => (
						<button
							key={item.label}
							type="button"
							aria-label={`Show step ${i + 1}: ${item.label}`}
							aria-current={i === beat ? "step" : undefined}
							onClick={() => setElapsed(i * BEAT_MS)}
							className="relative h-1 flex-1 overflow-hidden rounded-full bg-border"
						>
							<span
								className="absolute inset-0 origin-left bg-primary transition-transform duration-100 ease-linear"
								style={{ transform: `scaleX(${i < beat ? 1 : i === beat ? progress : 0})` }}
							/>
						</button>
					))}
				</div>
				<button
					type="button"
					onClick={() => setPaused((value) => !value)}
					aria-label={paused ? "Play the demo" : "Pause the demo"}
					className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground motion-reduce:hidden"
				>
					{paused ? <IconPlayerPlayFilled className="size-3" /> : <IconPlayerPauseFilled className="size-3" />}
				</button>
			</div>
			<p aria-live="polite" className="-mt-2 text-muted-foreground text-sm">
				<span className="font-medium text-foreground">{current.label}.</span> {current.caption}
			</p>
		</section>
	);
}
