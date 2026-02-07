import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ProblemSolution() {
	return (
		<section className="py-24 px-6">
			<div className="max-w-(--breakpoint-lg) mx-auto">
				<div className="text-center mb-16">
					<Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
						The Problem
					</Badge>
					<h2 className="text-3xl md:text-4xl font-semibold tracking-tight max-w-3xl mx-auto">
						You use one tool for your team and another for your users.{" "}
						<span className="text-muted-foreground">That's broken.</span>
					</h2>
				</div>

				<div className="grid md:grid-cols-2 gap-6 mb-12">
					{/* Before */}
					<div className="rounded-2xl border border-destructive/20 bg-destructive/[0.02] p-8">
						<p className="text-sm font-semibold text-destructive mb-4">Without Sayr</p>
						<ul className="space-y-3">
							{[
								"Internal tasks live in Linear, Jira, or Notion \u2014 invisible to users",
								"Feature requests pile up in Canny, Nolt, or email \u2014 disconnected from work",
								'Users ask "is this done yet?" because they can\'t see your board',
								"You manually copy updates between tools to keep users informed",
								"Two sources of truth that slowly drift apart",
							].map((item) => (
								<li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
									<span className="text-destructive/70 mt-0.5 shrink-0">{"\u2715"}</span>
									{item}
								</li>
							))}
						</ul>
					</div>

					{/* After */}
					<div className="rounded-2xl border border-success/20 bg-success/[0.02] p-8">
						<p className="text-sm font-semibold text-success mb-4">With Sayr</p>
						<ul className="space-y-3">
							{[
								"One board, two views \u2014 your team sees everything, users see what you allow",
								"Feature requests and bugs live as tasks — mark them public or keep them private",
								"Users track progress, vote, and comment on a public portal",
								"Status changes automatically notify subscribed users",
								"Single source of truth. Internal comments and private tasks stay hidden.",
							].map((item) => (
								<li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
									<Check className="size-4 text-success shrink-0 mt-0.5" />
									{item}
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}
