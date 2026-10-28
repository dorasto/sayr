import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const FAQS = [
	{
		q: "What makes Sayr different from Linear or Jira?",
		a: "Linear and Jira are internal-only tools: your users never see your board. Sayr has the same project management basics (boards, releases, priorities, GitHub integration) and adds a public portal where your users can view tasks, vote, post feedback and follow progress. You choose exactly what's visible.",
	},
	{
		q: "How does Sayr compare to Canny or Nolt?",
		a: "Canny and Nolt collect feedback, but the work happens in another tool, so you sync the two. In Sayr, a user's post is a task on your board. When you move it to Done, your users see it shipped, with nothing to copy across.",
	},
	{
		q: "Is it free to self-host?",
		a: "Yes. The Community edition is free to self-host with Docker Compose, with unlimited members, teams and releases on a single organization. The Enterprise edition is licensed and adds unlimited organizations.",
	},
	{
		q: "Does Sayr include AI?",
		a: "Yes, on the Pro plan. Sayr summarises each task, suggests assignees, priority, releases and related tasks, and drafts release notes from what you shipped. Self-hosted instances can turn AI on with their own API key.",
	},
	{
		q: "What does Sayr integrate with?",
		a: "GitHub (branches, pull requests and issues linked to tasks), a Discord bot for creating tasks, the sayr CLI, a REST API and a TypeScript SDK. Every integration is included on every plan.",
	},
	{
		q: "How does visibility work?",
		a: "Visibility is set per item. Each task can be public or private, and private tasks are hidden from your users entirely. Labels have their own visibility, so a public 'Bug' label can sit next to a private 'Needs review' one. Comments can be public or internal, and internal comments are only visible to your team.",
	},
	{
		q: "Can my users create accounts?",
		a: "Yes. Your users sign in on your public portal to post bug reports and feature requests, vote, and leave public comments. They never see internal data.",
	},
	{
		q: "Where is my data stored?",
		a: "On Sayr Cloud, workspace data is stored on EU servers: databases on Zerops in Czechia and files on Hetzner in Germany and Finland. Our subprocessors page lists every provider. If you self-host, your data stays wherever you run Sayr.",
	},
	{
		q: "What tech stack does Sayr use?",
		a: "TypeScript throughout: React 19 with TanStack Start for the frontend, Hono on Bun for the API, PostgreSQL with Drizzle ORM, Server-Sent Events for real-time updates, and Better Auth for authentication.",
	},
];

/**
 * Homepage FAQ. Native <details> elements, so every answer is in the server
 * HTML (search engines and AI crawlers can read them) and the accordion works
 * without JavaScript.
 */
export function FAQAccordion() {
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-(--breakpoint-md)">
				<div className="mb-16 text-center">
					<Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">
						FAQ
					</Badge>
					<h2 className="font-semibold text-3xl tracking-tight md:text-4xl">Frequently asked questions</h2>
				</div>

				<div className="space-y-2">
					{FAQS.map((faq) => (
						<details key={faq.q} className="group overflow-hidden rounded-xl border bg-card">
							<summary className="flex cursor-pointer list-none items-center justify-between p-5 text-left [&::-webkit-details-marker]:hidden">
								<span className="font-medium text-sm">{faq.q}</span>
								<ChevronDown className="ml-4 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
							</summary>
							<p className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}
