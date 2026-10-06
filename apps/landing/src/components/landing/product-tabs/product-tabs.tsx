import {
	IconArrowRight,
	IconCheck,
	IconLayoutKanban,
	IconMap,
	IconMessages,
	IconNews,
	IconRocket,
	IconServer,
} from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { AppWindow } from "../app-ui/app-window";
import { BoardList } from "../app-ui/board-views";
import { DEMO_TASKS } from "../app-ui/demo-data";
import { Layer } from "../app-ui/layer";
import { PortalChangelog, PortalFeedback, PortalRoadmap } from "../app-ui/portal-views";
import { PortalWindow } from "../app-ui/portal-window";
import { ReleasePanel } from "../app-ui/release-panel";
import { SelfHostPanel } from "../app-ui/self-host-panel";

/** Open work only, so the board fits its window without a Done group. */
const OPEN_TASKS = DEMO_TASKS.filter((task) => task.status !== "done");

interface Tab {
	id: string;
	label: string;
	icon: typeof IconLayoutKanban;
	/** Who sees it: the team's app or the public portal. */
	side: "Your team" | "Your users" | "Your servers";
	title: string;
	text: string;
	points: string[];
	link: { href: string; label: string };
	visual: ReactNode;
}

const TABS: Tab[] = [
	{
		id: "board",
		label: "Board",
		icon: IconLayoutKanban,
		side: "Your team",
		title: "A fast board for everything you're building",
		text: "Every task, bug and request in one backlog, with the fields your team needs and the ones it doesn't hidden away.",
		points: ["List and kanban views", "Group, filter and save views", "Real-time for the whole team"],
		link: { href: "/features/tasks", label: "Task management" },
		visual: (
			<AppWindow crumbs={["Tasks"]} toolbar={`${OPEN_TASKS.length} tasks`} className="h-[33rem]">
				<BoardList tasks={OPEN_TASKS} />
			</AppWindow>
		),
	},
	{
		id: "feedback",
		label: "Feedback",
		icon: IconMessages,
		side: "Your users",
		title: "A feedback board on your real backlog",
		text: "Users post ideas and bugs, vote and comment. Each post is a task your team can pick up, with nothing to copy over.",
		points: ["Voting and comments", "Categories, labels and filters", "Public and internal comments"],
		link: { href: "/features/voting", label: "User voting" },
		visual: (
			<PortalWindow active="feedback" className="h-[33rem]">
				<PortalFeedback />
			</PortalWindow>
		),
	},
	{
		id: "roadmap",
		label: "Roadmap",
		icon: IconMap,
		side: "Your users",
		title: "A roadmap that keeps itself up to date",
		text: "Planned, in progress and shipped, straight from task status. Move a task and the public roadmap follows.",
		points: ["Group by status or by release", "Only shows what you've made public", "Shipped work stays visible"],
		link: { href: "/features/public-portal", label: "Public portal" },
		visual: (
			<PortalWindow active="feedback" className="h-[33rem]">
				<PortalRoadmap />
			</PortalWindow>
		),
	},
	{
		id: "changelog",
		label: "Changelog",
		icon: IconNews,
		side: "Your users",
		title: "A changelog written from what you shipped",
		text: "Publish a release and it lands on your changelog with its notes, the posts it closed, and what's coming next.",
		points: ["Release notes and progress", "What's coming next", "Comments and reactions"],
		link: { href: "/features/public-portal", label: "Public portal" },
		visual: (
			<PortalWindow active="changelog" className="h-[33rem]">
				<PortalChangelog />
			</PortalWindow>
		),
	},
	{
		id: "releases",
		label: "Releases",
		icon: IconRocket,
		side: "Your team",
		title: "Plan releases and keep everyone posted",
		text: "Group tasks into a release, track its progress, and post status updates your users can follow.",
		points: ["Progress from the tasks inside", "Updates: on track, at risk, off track", "Linked GitHub pull request"],
		link: { href: "/docs/organize/releases", label: "Releases docs" },
		visual: (
			<AppWindow active="releases" crumbs={["Releases", "v2.4"]} className="h-[33rem]">
				<ReleasePanel released={false} showUpdate />
			</AppWindow>
		),
	},
	{
		id: "self-host",
		label: "Self-host",
		icon: IconServer,
		side: "Your servers",
		title: "Run it on your own servers",
		text: "Sayr is source-available. Use our EU cloud, or self-host the Community edition for free with Docker Compose.",
		points: [
			"Postgres, Redis and storage included",
			"Update with docker compose pull",
			"Your data, on your own servers",
		],
		link: { href: "/docs/self-hosting/get-started", label: "Self-hosting guide" },
		visual: <SelfHostPanel />,
	},
];

/**
 * Homepage section: the product's main areas as tabs (Featurebase-style).
 * Every tab uses the same layout: who it's for, a heading, one sentence,
 * three points, a link, and a live recreation. Panels share one grid cell,
 * so switching tabs never changes the page height.
 */
export function ProductTabs() {
	const [activeId, setActiveId] = useState(TABS[0]?.id ?? "board");

	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-6xl">
				<div className="mx-auto max-w-2xl text-center">
					<p className="font-medium text-primary text-sm">One tool for the whole loop</p>
					<h2 className="mt-3 font-semibold text-3xl! tracking-tight md:text-4xl!">
						Your team's tracker and your users' portal, together
					</h2>
				</div>

				<div
					role="tablist"
					aria-label="Product areas"
					className="mx-auto mt-10 flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-xl border bg-card p-1"
				>
					{TABS.map((tab) => (
						<button
							key={tab.id}
							type="button"
							role="tab"
							id={`product-tab-${tab.id}`}
							aria-selected={tab.id === activeId}
							aria-controls={`product-panel-${tab.id}`}
							onClick={() => setActiveId(tab.id)}
							className={cn(
								"flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-sm transition-colors",
								tab.id === activeId
									? "bg-accent text-foreground"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							<tab.icon className="size-4" />
							{tab.label}
						</button>
					))}
				</div>

				<div className="mt-10 grid">
					{TABS.map((tab) => (
						<Layer key={tab.id} active={tab.id === activeId}>
							<div
								id={`product-panel-${tab.id}`}
								role="tabpanel"
								aria-labelledby={`product-tab-${tab.id}`}
								className="grid items-center gap-10 lg:grid-cols-[19rem_minmax(0,1fr)]"
							>
								<div className="flex flex-col gap-4">
									<p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
										{tab.side}
									</p>
									<h3 className="font-semibold text-2xl! tracking-tight">{tab.title}</h3>
									<p className="text-muted-foreground">{tab.text}</p>
									<ul className="flex flex-col gap-2 text-sm">
										{tab.points.map((point) => (
											<li key={point} className="flex items-center gap-2">
												<IconCheck className="size-4 shrink-0 text-primary" />
												{point}
											</li>
										))}
									</ul>
									<a
										href={tab.link.href}
										tabIndex={tab.id === activeId ? undefined : -1}
										className="flex w-fit items-center gap-1 text-primary text-sm hover:underline"
									>
										{tab.link.label} <IconArrowRight className="size-4" />
									</a>
								</div>
								<div className="min-w-0">{tab.visual}</div>
							</div>
						</Layer>
					))}
				</div>
			</div>
		</section>
	);
}
