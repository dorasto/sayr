/**
 * Content for /compare/* pages (SAY-93). Each entry fills the comparison
 * template in src/components/compare/comparison-page.tsx; the page's <title>,
 * description and "updated" date stay in src/data/marketing-pages.ts.
 *
 * Only claim what we can stand behind: check the competitor's own pricing and
 * docs, and date anything that can change ("as of October 2026").
 */

/** true = has it, false = doesn't, "partial" = partly, or a short text answer. */
export type ComparisonCell = boolean | "partial" | string;

/** Live recreations a reason row can show; mapped to components in the template. */
export type ComparisonVisual = "github" | "visibility" | "self-host" | "ai";

export interface Comparison {
	competitor: {
		name: string;
		/** One line on what the competitor is, for the "at a glance" card. */
		tagline: string;
		points: string[];
		bestFor: string;
	};
	sayr: { tagline: string; points: string[]; bestFor: string };
	hero: { eyebrow: string; title: string; lead: string };
	reasons: {
		title: string;
		intro: string;
		items: { label: string; title: string; text: string; visual: ComparisonVisual; plan?: string }[];
	};
	pricing: {
		competitor: { model: string; summary: string; plans: { name: string; price: string; detail: string }[] };
		sayr: { model: string; summary: string; plans: { name: string; price: string; detail: string }[] };
		/** e.g. "October 2026" — prices change, so say when we checked. */
		checked: string;
		sourceUrl: string;
	};
	table: {
		group: string;
		rows: { feature: string; sayr: ComparisonCell; competitor: ComparisonCell; note?: string }[];
	}[];
	fit: { competitor: string[]; sayr: string[] };
	switching: { title: string; text: string; steps: { title: string; text: string }[] };
	faqs: { q: string; a: string }[];
}

export const COMPARISONS: Record<string, Comparison> = {
	"sayr-vs-canny": {
		competitor: {
			name: "Canny",
			tagline: "A feedback board that syncs to the tracker your team works in.",
			points: [
				"Collects posts and votes from your users",
				"Pushes them to Jira, Linear or GitHub, with sync rules",
				"Priced by tracked users: anyone who posts, votes or comments",
			],
			bestFor: "Sales and customer success teams staying on Jira or Linear",
		},
		sayr: {
			tagline: "The tracker itself, with the feedback board, roadmap and changelog built in.",
			points: [
				"Your backlog and your users' board are the same tasks",
				"Each task, label and comment is public or private",
				"Priced by team seat. Voters are never counted",
			],
			bestFor: "Product teams, dev tools and open-source projects that work in public",
		},
		hero: {
			eyebrow: "Sayr vs Canny",
			title: "The Canny alternative that's also your project tracker",
			lead: "Canny collects feedback, then syncs it to a separate tracker. In Sayr, your users' posts are tasks on your team's board, so your roadmap and changelog are never out of date.",
		},
		reasons: {
			title: "Why teams pick Sayr over Canny",
			intro: "Canny is good at collecting feedback. Sayr is built so the feedback and the work are the same thing.",
			items: [
				{
					label: "One backlog",
					title: "No sync rules to babysit",
					text: "With Canny, a request lives twice: the post your users see and the issue your team works on. In Sayr the post is the task. Name a branch after it, merge the pull request, and your users see it shipped.",
					visual: "github",
				},
				{
					label: "Public or private",
					title: "Internal talk next to public replies",
					text: "Each task, label and comment can be public or private. Your team discusses in the same thread your users read, and they only ever see what you made public.",
					visual: "visibility",
				},
				{
					label: "Built-in AI",
					title: "Summaries and suggestions on every task",
					text: "Sayr summarises long threads, suggests assignees, priority and related tasks, and drafts release notes from what you shipped. AI runs on Mistral in the EU.",
					visual: "ai",
					plan: "Pro",
				},
				{
					label: "Own your data",
					title: "Self-host it, or use our EU cloud",
					text: "Sayr is source-available. Run the Community edition on your own servers for free with Docker Compose, or use Sayr Cloud, where workspace data stays on EU servers.",
					visual: "self-host",
				},
			],
		},
		pricing: {
			competitor: {
				model: "Priced by tracked users",
				summary:
					"Anyone who posts, votes or comments counts, including feedback your team captures for them. Your bill grows as your community gets more active, and you still pay for your tracker.",
				plans: [
					{ name: "Free", price: "$0", detail: "Up to 25 tracked users" },
					{ name: "Pro", price: "From $79/mo", detail: "Billed yearly, 100 tracked users" },
					{ name: "Business", price: "Custom", detail: "CRM integrations and more" },
				],
			},
			sayr: {
				model: "Priced by team seat",
				summary:
					"Only your team counts. The people who post, vote and comment on your public board are free, however many there are. Your tracker is included.",
				plans: [
					{ name: "Free", price: "$0", detail: "Up to 5 members, unlimited voters" },
					{ name: "Pro", price: "$3/seat/mo", detail: "Unlimited members, releases, AI" },
					{ name: "Self-hosted", price: "Free", detail: "Community edition on your servers" },
				],
			},
			checked: "October 2026",
			sourceUrl: "https://canny.io/pricing",
		},
		table: [
			{
				group: "Feedback and the public side",
				rows: [
					{ feature: "Public feedback board with voting", sayr: true, competitor: true },
					{ feature: "Public roadmap", sayr: true, competitor: true },
					{ feature: "Changelog", sayr: "Pro plan", competitor: true },
					{ feature: "Unlimited voters at no extra cost", sayr: true, competitor: false },
				],
			},
			{
				group: "Tracking the work",
				rows: [
					{
						feature: "Built-in project tracker",
						sayr: true,
						competitor: false,
						note: "Board and list views, priorities, assignees, releases",
					},
					{
						feature: "Sync to Jira or Linear",
						sayr: false,
						competitor: true,
						note: "Sayr replaces the tracker rather than syncing to one",
					},
					{
						feature: "GitHub integration",
						sayr: true,
						competitor: "partial",
						note: "Sayr links branches, pull requests and issues; Canny pushes posts to issues",
					},
				],
			},
			{
				group: "Visibility and control",
				rows: [
					{
						feature: "Public or private per task, label and comment",
						sayr: true,
						competitor: "partial",
						note: "Canny: private boards on paid plans",
					},
					{ feature: "Internal comments in the public thread", sayr: true, competitor: "partial" },
					{ feature: "Teams with granular permissions", sayr: true, competitor: "partial" },
				],
			},
			{
				group: "AI and integrations",
				rows: [
					{
						feature: "AI",
						sayr: "Pro plan",
						competitor: true,
						note: "Sayr: summaries, suggestions, release notes. Canny: Autopilot feedback capture",
					},
					{ feature: "CRM integrations (Salesforce, HubSpot)", sayr: false, competitor: "Business plan" },
				],
			},
			{
				group: "Hosting and data",
				rows: [
					{ feature: "Self-hostable", sayr: true, competitor: false },
					{ feature: "Source-available", sayr: true, competitor: false },
				],
			},
		],
		fit: {
			competitor: [
				"Feedback is mainly a sales and customer success tool for you, with CRM integrations.",
				"Your team is staying on Jira or Linear, and you want feedback synced into it.",
				"You need years of Canny data moved over today. Sayr has no Canny importer yet.",
			],
			sayr: [
				"You want one tool for your backlog, feedback board, roadmap and changelog, with no sync.",
				"You work in public: dev tools, open-source projects and indie SaaS.",
				"You want to self-host, or keep your data in the EU.",
				"Your community is growing and you don't want to pay for every voter.",
			],
		},
		switching: {
			title: "Moving from Canny",
			text: "There's no one-click Canny importer yet. Most teams start fresh with their open requests and point users to the new board.",
			steps: [
				{ title: "Create your workspace", text: "Sign up free, or self-host the Community edition." },
				{
					title: "Bring your open requests",
					text: "Recreate them by hand, or script it with the Sayr CLI or REST API.",
				},
				{ title: "Share your new board", text: "Link your public board from your app, site and Discord." },
			],
		},
		faqs: [
			{
				q: "Is Sayr a good Canny alternative?",
				a: "If you want feedback and your team's work in one place, yes. Canny is a feedback board that syncs to a separate tracker. Sayr is the tracker, with a public board, roadmap and changelog built in, so there's nothing to sync.",
			},
			{
				q: "Do voters count towards Sayr's price?",
				a: "No. Sayr is priced by team seat: Free covers up to 5 members, and Pro is $3 per seat per month. The people who post, vote and comment on your public board are never counted.",
			},
			{
				q: "Can I keep using Jira or Linear with Sayr?",
				a: "Sayr doesn't sync to Jira or Linear. It's designed to replace the tracker, so your backlog and your public board are the same tasks. If you're staying on Jira or Linear, Canny's sync is built for that setup.",
			},
			{
				q: "Can I import my data from Canny?",
				a: "Not with one click yet. You can recreate open requests by hand or script it with the Sayr CLI or REST API. If an importer would help you switch, tell us on our public board.",
			},
			{
				q: "Does Sayr have AI like Canny?",
				a: "Yes, on the Pro plan. Sayr summarises tasks, suggests assignees, priority, releases and related tasks, and drafts release notes. Self-hosted instances can turn AI on with their own API key.",
			},
		],
	},
};

export function getComparison(slug: string) {
	return COMPARISONS[slug];
}
