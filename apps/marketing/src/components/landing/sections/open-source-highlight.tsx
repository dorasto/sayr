import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OpenSourceHighlight() {
	return (
		<section className="py-24 px-6">
			<div className="max-w-(--breakpoint-lg) mx-auto">
				<div className="relative overflow-hidden rounded-3xl border p-10 md:p-16">
					<div className="absolute inset-0">
						<div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px]" />
						<div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[60px]" />
					</div>

					<div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
						<div>
							<Github className="size-12 text-primary mb-6" />
							<h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
								100% Open Source
							</h2>
							<p className="text-muted-foreground mb-6">
								Every line of code is public. Fork it, self-host it on your own infrastructure with Docker, or contribute back to the project. No vendor lock-in, no surprises.
							</p>
							<div className="flex flex-wrap gap-3">
								<Button size="lg" className="rounded-full shadow-lg shadow-primary/20" asChild>
									<a href="https://github.com/dorasto/sayr" target="_blank" rel="noreferrer">
										<Github className="size-4" /> Star on GitHub
									</a>
								</Button>
								<Button variant="outline" size="lg" className="rounded-full shadow-none" asChild>
									<a href="/docs/contributing/local-development">Contribute</a>
								</Button>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							{[
								{ label: "License", value: "OSS", desc: "Open source core" },
								{ label: "Self-Host", value: "Docker", desc: "Full data sovereignty" },
								{ label: "Stack", value: "TypeScript", desc: "React, Hono, Drizzle" },
								{ label: "Community", value: "Open", desc: "PRs and issues welcome" },
							].map((s) => (
								<div key={s.label} className="rounded-xl border bg-card p-5 text-center">
									<p className="text-xl font-bold">{s.value}</p>
									<p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
									<p className="text-[10px] text-muted-foreground/60 mt-1">{s.label}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
