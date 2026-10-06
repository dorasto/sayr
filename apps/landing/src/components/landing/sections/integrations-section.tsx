import {
	IconArrowRight,
	IconBrandDiscord,
	IconBrandGithub,
	IconCode,
	IconRobot,
	IconTerminal2,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import {
	AGENT_STEPS,
	AgentPanel,
	CLI_STEPS,
	CliPanel,
	DISCORD_STEPS,
	DiscordPanel,
	GITHUB_STEPS,
	GithubPanel,
	type ReplayProps,
	SDK_STEPS,
	SdkPanel,
} from "../app-ui/integration-panels";
import { useReplay } from "../app-ui/replay";

interface Integration {
	name: string;
	icon: typeof IconBrandGithub;
	title: string;
	text: string;
	link: { href: string; label: string };
	/** The live recreation, and how many steps its replay has. */
	Visual: ComponentType<ReplayProps>;
	steps: number;
	/** Wide cards span two columns on large screens. */
	wide?: boolean;
}

const INTEGRATIONS: Integration[] = [
	{
		name: "GitHub",
		icon: IconBrandGithub,
		title: "Ship in GitHub, and your users see it",
		text: "Name a branch after a task and it's linked. Merge the pull request and the task moves to Done, so its public post shows it shipped. Issues opened on public repos become tasks too.",
		link: { href: "/docs/integrations/github", label: "GitHub integration" },
		Visual: GithubPanel,
		steps: GITHUB_STEPS,
		wide: true,
	},
	{
		name: "Discord",
		icon: IconBrandDiscord,
		title: "Take reports from your community",
		text: "Run /sayr create, fill in your template, and the task lands on your board. The bot keeps a post in your channel up to date.",
		link: { href: "/docs/integrations/discordbot", label: "Discord bot" },
		Visual: DiscordPanel,
		steps: DISCORD_STEPS,
	},
	{
		name: "CLI",
		icon: IconTerminal2,
		title: "Work from the terminal",
		text: "Create, update and comment on tasks from your shell or a CI job. Every command can print JSON.",
		link: { href: "/docs/cli", label: "Sayr CLI" },
		Visual: CliPanel,
		steps: CLI_STEPS,
	},
	{
		name: "API and SDK",
		icon: IconCode,
		title: "Put your roadmap on your own site",
		text: "Read your public tasks and stream live updates with the TypeScript SDK, or call the REST API.",
		link: { href: "/docs/api/sdk", label: "Public SDK" },
		Visual: SdkPanel,
		steps: SDK_STEPS,
	},
	{
		name: "Coding agents",
		icon: IconRobot,
		title: "Hand a task to your agent",
		text: "The Paseo plugin puts your board next to your coding agents. Pick a task and send it over.",
		link: { href: "https://www.npmjs.com/package/@sayrio/paseo-plugin", label: "Paseo plugin" },
		Visual: AgentPanel,
		steps: AGENT_STEPS,
	},
];

/**
 * One integration: label, heading, sentence, link, and its recreation. The
 * recreation plays its script when the card first scrolls into view, and again
 * whenever it's hovered or focused.
 */
function IntegrationCard({ integration }: { integration: Integration }) {
	const { at, ref, triggers } = useReplay(integration.steps);
	return (
		<article
			ref={ref}
			{...triggers}
			className={cn(
				"group flex flex-col gap-5 rounded-2xl border bg-card/40 p-5 transition-colors duration-300 hover:border-primary/40 hover:bg-card/70",
				integration.wide && "lg:col-span-2"
			)}
		>
			<div className="flex flex-col gap-2">
				<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider transition-colors group-hover:text-primary">
					<integration.icon className="size-4" />
					{integration.name}
				</p>
				<h3 className="font-semibold text-lg! tracking-tight">{integration.title}</h3>
				<p className="text-muted-foreground text-sm">{integration.text}</p>
			</div>
			{/* Wide cards are shorter than their row partner, so centre the visual rather than leave a gap. */}
			<div className={cn("min-w-0", integration.wide ? "flex flex-1 flex-col justify-center" : "mt-auto")}>
				<integration.Visual at={at} />
			</div>
			<a href={integration.link.href} className="flex w-fit items-center gap-1 text-primary text-sm hover:underline">
				{integration.link.label} <IconArrowRight className="size-4" />
			</a>
		</article>
	);
}

/**
 * Homepage section: where Sayr connects. Feedback tools sell a sync to your
 * tracker; Sayr is the tracker, so each card shows work flowing into (or out
 * of) the one backlog, with a live recreation rather than a logo wall.
 */
export function IntegrationsSection() {
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-6xl">
				<div className="mx-auto max-w-2xl text-center">
					<p className="font-medium text-primary text-sm">Integrations</p>
					<h2 className="mt-3 font-semibold text-3xl! tracking-tight md:text-4xl!">
						Works where your team already is
					</h2>
					<p className="mt-4 text-muted-foreground">
						Feedback tools sync to your tracker. Sayr is the tracker, so GitHub, Discord and your terminal feed
						straight into the backlog your team works from.
					</p>
				</div>

				<div className="mt-14 grid gap-4 lg:grid-cols-3">
					{INTEGRATIONS.map((integration) => (
						<IntegrationCard key={integration.name} integration={integration} />
					))}
				</div>

				<p className="mt-8 text-center text-muted-foreground text-sm">
					Every integration is included on every plan, including Free and self-hosted.
				</p>
			</div>
		</section>
	);
}
