// Demo workspace for the landing page's live HTML recreations of the admin
// app (SAY-93). Doras (doras.to), a link-in-bio and link-shortening tool, is
// the example workspace; the tasks are illustrative, not real Doras data.

export type DemoStatus = "backlog" | "todo" | "in-progress" | "done";
export type DemoPriority = "urgent" | "high" | "medium" | "low" | "none";

export interface DemoLabel {
	name: string;
	color: string;
}

export interface DemoPerson {
	name: string;
	initials: string;
	color: string;
}

export interface DemoTask {
	key: string;
	title: string;
	status: DemoStatus;
	priority: DemoPriority;
	labels: DemoLabel[];
	assignee?: DemoPerson;
	visible: "public" | "private";
	votes?: number;
	comments?: number;
}

export const ORG = { name: "Doras", portal: "doras.sayr.io" };

const LABELS = {
	links: { name: "Short links", color: "#3b82f6" },
	bio: { name: "Bio page", color: "#a855f7" },
	analytics: { name: "Analytics", color: "#22c55e" },
	domains: { name: "Domains", color: "#14b8a6" },
	bug: { name: "Bug", color: "#ef4444" },
	mobile: { name: "Mobile", color: "#f59e0b" },
} satisfies Record<string, DemoLabel>;

export const PEOPLE = {
	tom: { name: "Tom", initials: "TO", color: "#f97316" },
	trent: { name: "Trent", initials: "TR", color: "#3b82f6" },
	will: { name: "Will", initials: "WI", color: "#a855f7" },
} satisfies Record<string, DemoPerson>;

/** The task the homepage demo follows from public idea to shipped release. */
export const FEATURED_TASK: DemoTask = {
	key: "DOR-214",
	title: "Custom domains for short links",
	status: "in-progress",
	priority: "high",
	labels: [LABELS.links, LABELS.domains],
	assignee: PEOPLE.tom,
	visible: "public",
	votes: 142,
	comments: 18,
};

export const DEMO_TASKS: DemoTask[] = [
	FEATURED_TASK,
	{
		key: "DOR-221",
		title: "Rate-limit link creation on the API",
		status: "in-progress",
		priority: "urgent",
		labels: [LABELS.links],
		assignee: PEOPLE.trent,
		visible: "private",
	},
	{
		key: "DOR-209",
		title: "QR code for every short link",
		status: "todo",
		priority: "medium",
		labels: [LABELS.links],
		assignee: PEOPLE.will,
		visible: "public",
		votes: 87,
		comments: 9,
	},
	{
		key: "DOR-216",
		title: "Move click analytics to the new pipeline",
		status: "todo",
		priority: "high",
		labels: [LABELS.analytics],
		assignee: PEOPLE.will,
		visible: "private",
	},
	{
		key: "DOR-198",
		title: "Schedule bio links to go live at a set time",
		status: "backlog",
		priority: "low",
		labels: [LABELS.bio],
		visible: "public",
		votes: 64,
		comments: 12,
	},
	{
		key: "DOR-230",
		title: "Reorder bio links by drag and drop",
		status: "backlog",
		priority: "none",
		labels: [LABELS.bio, LABELS.mobile],
		visible: "public",
		votes: 23,
		comments: 3,
	},
	{
		key: "DOR-187",
		title: "UTM builder for short links",
		status: "done",
		priority: "high",
		labels: [LABELS.links, LABELS.analytics],
		assignee: PEOPLE.trent,
		visible: "public",
		votes: 119,
		comments: 21,
	},
	{
		key: "DOR-190",
		title: "Fix broken avatars on bio pages",
		status: "done",
		priority: "medium",
		labels: [LABELS.bio, LABELS.bug],
		assignee: PEOPLE.will,
		visible: "private",
	},
];

export const STATUS_ORDER: DemoStatus[] = ["in-progress", "todo", "backlog", "done"];

export const STATUS_LABEL: Record<DemoStatus, string> = {
	backlog: "Backlog",
	todo: "Todo",
	"in-progress": "In Progress",
	done: "Done",
};

/** What end users see on the portal for each internal status. */
export const PUBLIC_STATUS_LABEL: Record<DemoStatus, string> = {
	backlog: "Open",
	todo: "Planned",
	"in-progress": "In progress",
	done: "Shipped",
};

/** Portal visitors who comment in the demo. */
export const VISITORS = {
	sam: { name: "Sam", initials: "SA", color: "#0ea5e9" },
	priya: { name: "Priya", initials: "PR", color: "#ec4899" },
	jordan: { name: "Jordan", initials: "JO", color: "#14b8a6" },
} satisfies Record<string, DemoPerson>;
