import { IconServer, IconWorld } from "@tabler/icons-react";

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
			<div className="overflow-hidden rounded-xl border bg-[#0c0c0e] font-mono text-[12.5px] shadow-2xl shadow-black/40">
				<div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-[11px] text-white/50">
					<span className="flex gap-1.5" aria-hidden>
						<span className="size-2.5 rounded-full bg-white/20" />
						<span className="size-2.5 rounded-full bg-white/20" />
						<span className="size-2.5 rounded-full bg-white/20" />
					</span>
					<span className="mx-auto">your-server</span>
				</div>
				<pre className="overflow-x-auto p-4 text-white/90 leading-relaxed">
					<code>
						<span className="text-white/40"># 1. Get the compose file</span>
						{"\n"}
						<span className="text-white/40">$ </span>curl -O
						https://raw.githubusercontent.com/dorasto/sayr/main/docker/self-host/compose.yml
						{"\n\n"}
						<span className="text-white/40"># 2. Set your domain, Postgres, S3 storage and auth secret</span>
						{"\n"}
						<span className="text-white/40">$ </span>nano .env
						{"\n\n"}
						<span className="text-white/40"># 3. Start Sayr</span>
						{"\n"}
						<span className="text-white/40">$ </span>docker compose up -d
						{"\n"}
						<span className="text-success">✔ Container sayr-backend Started</span>
						{"\n"}
						<span className="text-success">✔ Container sayr-start Started</span>
					</code>
				</pre>
			</div>
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
