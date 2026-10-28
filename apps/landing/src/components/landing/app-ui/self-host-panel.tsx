import { IconServer, IconWorld } from "@tabler/icons-react";
import { Dim, Terminal } from "./terminal";

const EDITIONS = [
	{ name: "Cloud", detail: "Hosted by us in the EU", icon: IconWorld },
	{ name: "Community", detail: "Free to self-host", icon: IconServer },
	{ name: "Enterprise", detail: "Self-host with every feature", icon: IconServer },
];

/**
 * Self-hosting, as the docs describe it (docs/self-hosting/get-started):
 * fetch the compose file, set the environment, start it. Then the three
 * editions side by side.
 */
export function SelfHostPanel() {
	return (
		<div className="flex flex-col gap-3">
			<Terminal title="your-server">
				<Dim># 1. Get the compose file</Dim>
				{"\n"}
				<Dim>$ </Dim>curl -O https://raw.githubusercontent.com/dorasto/sayr/main/docker/self-host/compose.yml
				{"\n\n"}
				<Dim># 2. Set your domain, Postgres, S3 storage and auth secret</Dim>
				{"\n"}
				<Dim>$ </Dim>nano .env
				{"\n\n"}
				<Dim># 3. Start Sayr</Dim>
				{"\n"}
				<Dim>$ </Dim>docker compose up -d
				{"\n"}
				<span className="text-success">✔ Container sayr-backend Started</span>
				{"\n"}
				<span className="text-success">✔ Container sayr-start Started</span>
			</Terminal>
			<div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border text-[13px]">
				{EDITIONS.map((edition) => (
					<div key={edition.name} className="flex flex-col gap-1 bg-card p-3">
						<span className="flex items-center gap-1.5 font-medium">
							<edition.icon className="size-4 text-primary" /> {edition.name}
						</span>
						<span className="text-muted-foreground text-xs">{edition.detail}</span>
					</div>
				))}
			</div>
		</div>
	);
}
