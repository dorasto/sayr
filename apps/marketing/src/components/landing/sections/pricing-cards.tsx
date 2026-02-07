import { ArrowUpRight, Check, Server, Cloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PricingCards() {
	return (
		<section className="py-24 px-6 relative">
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--primary)_0%,transparent_50%)] opacity-[0.03]" />

			<div className="relative z-10 max-w-(--breakpoint-lg) mx-auto">
				<div className="text-center mb-16">
					<Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
						Pricing
					</Badge>
					<h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
						Transparent pricing for a transparent tool
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						Self-host it yourself or let us handle infrastructure. Pricing details coming soon.
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
					<div className="rounded-2xl border bg-card p-8">
						<Server className="size-8 text-muted-foreground mb-4" />
						<h3 className="text-xl font-semibold mb-1">Self-Hosted</h3>
						<p className="text-4xl font-bold mt-3 mb-1">Free</p>
						<p className="text-sm text-muted-foreground mb-8">Open source core. Some features may require a license key.</p>
						<ul className="space-y-3 mb-8">
							{[
								"Core features included",
								"Docker Compose deployment",
								"Community support",
								"Full data sovereignty",
								"Premium features with license key",
							].map((f) => (
								<li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
									<Check className="size-4 text-primary shrink-0" /> {f}
								</li>
							))}
						</ul>
						<Button variant="outline" className="w-full rounded-full" asChild>
							<a href="/docs/self-hosting/railway">Deploy Guide</a>
						</Button>
					</div>

					<div className="rounded-2xl border-2 border-primary/30 bg-card p-8 relative shadow-lg shadow-primary/5">
						<Badge className="absolute -top-3 right-6 text-xs shadow-lg shadow-primary/20">
							Recommended
						</Badge>
						<Cloud className="size-8 text-primary mb-4" />
						<h3 className="text-xl font-semibold mb-1">Sayr Cloud</h3>
						<p className="text-4xl font-bold mt-3 mb-1">Free</p>
						<p className="text-sm text-muted-foreground mb-8">Get started free. Plans coming soon.</p>
						<ul className="space-y-3 mb-8">
							{[
								"Everything in self-hosted",
								"Managed infrastructure",
								"Automatic backups",
								"Priority support",
								"Custom domain",
							].map((f) => (
								<li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
									<Check className="size-4 text-primary shrink-0" /> {f}
								</li>
							))}
						</ul>
						<Button className="w-full rounded-full shadow-lg shadow-primary/20" asChild>
							<a href="https://app.sayr.io">
								Start Free <ArrowUpRight className="size-4" />
							</a>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
