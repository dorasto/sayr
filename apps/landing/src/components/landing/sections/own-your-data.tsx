import { IconArrowRight, IconBrandGithub, IconCheck, IconServer, IconWorld } from "@tabler/icons-react";
import type { ReactNode } from "react";

function Point({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-start gap-2">
			<IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
			<span>{children}</span>
		</li>
	);
}

/**
 * Homepage section: the "own it" pillar. Self-host the source-available code,
 * or use the EU cloud. Merges the old open-source and EU sections. Wording
 * follows the SAY-93 rules: "source-available", never "open source"; workspace
 * data is stored on EU servers (not "never leaves the EU": email, logging and
 * DNS providers aren't all European).
 */
export function OwnYourData() {
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-6xl">
				<div className="mx-auto max-w-2xl text-center">
					<p className="font-medium text-primary text-sm">Yours to run</p>
					<h2 className="mt-3 font-semibold text-3xl! tracking-tight md:text-4xl!">
						Source-available, self-hostable, made in the EU
					</h2>
					<p className="mt-4 text-muted-foreground">
						Run Sayr on your own servers, or let us host it in the EU. Either way, the code is public and nothing
						locks you in.
					</p>
				</div>

				<div className="mt-14 grid gap-4 md:grid-cols-2">
					<article className="flex flex-col gap-5 rounded-2xl border bg-card/40 p-6">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<IconServer className="size-4" /> Self-host
						</p>
						<h3 className="font-semibold text-xl! tracking-tight">Run it on your own servers</h3>
						<p className="text-muted-foreground text-sm">
							Sayr's source code is public on GitHub under the Sustainable Use License. Read it, fork it, and
							self-host it with Docker Compose.
						</p>
						<ul className="flex flex-col gap-2 text-sm">
							<Point>Community edition is free: unlimited members, teams and releases</Point>
							<Point>Enterprise edition for unlimited organizations</Point>
							<Point>Postgres, Redis and storage, all in one compose file</Point>
						</ul>
						<div className="mt-auto flex flex-wrap gap-4 text-sm">
							<a
								href="https://github.com/dorasto/sayr"
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-1.5 text-primary hover:underline"
							>
								<IconBrandGithub className="size-4" /> Star on GitHub
							</a>
							<a
								href="/docs/self-hosting/get-started"
								className="flex items-center gap-1 text-primary hover:underline"
							>
								Self-hosting guide <IconArrowRight className="size-4" />
							</a>
						</div>
					</article>

					<article className="flex flex-col gap-5 rounded-2xl border bg-card/40 p-6">
						<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
							<IconWorld className="size-4" /> Sayr Cloud
						</p>
						<h3 className="font-semibold text-xl! tracking-tight">Or use our cloud, hosted in the EU</h3>
						<p className="text-muted-foreground text-sm">
							Sayr is built by Doras Media Ltd, an Irish company. Sayr Cloud runs on European infrastructure, and
							your workspace data is stored on EU servers.
						</p>
						<ul className="flex flex-col gap-2 text-sm">
							<Point>Databases and compute on Zerops, Czechia</Point>
							<Point>Files on Hetzner, Germany and Finland</Point>
							<Point>Static assets through Bunny CDN, Slovenia</Point>
							<Point>AI runs on Mistral in France, through an EU-only gateway</Point>
						</ul>
						<div className="mt-auto text-sm">
							<a
								href="/legal/subprocessors"
								className="flex w-fit items-center gap-1 text-primary hover:underline"
							>
								All subprocessors <IconArrowRight className="size-4" />
							</a>
						</div>
					</article>
				</div>
			</div>
		</section>
	);
}
