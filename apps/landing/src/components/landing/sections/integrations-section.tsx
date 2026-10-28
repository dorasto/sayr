import { IconBrandDiscord, IconBrandGithub, IconCode, IconRobot, IconTerminal2 } from "@tabler/icons-react";
import {
	AGENT_STEPS,
	AgentPanel,
	CLI_STEPS,
	CliPanel,
	DISCORD_STEPS,
	DiscordPanel,
	GITHUB_STEPS,
	GithubPanel,
	SDK_STEPS,
	SdkPanel,
} from "../app-ui/integration-panels";
import { ReplayCard, type ReplayCardItem } from "./replay-card";

const INTEGRATIONS: ReplayCardItem[] = [
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
						<ReplayCard key={integration.name} item={integration} />
					))}
				</div>

				<p className="mt-8 text-center text-muted-foreground text-sm">
					Every integration is included on every plan, including Free and self-hosted.
				</p>
			</div>
		</section>
	);
}
