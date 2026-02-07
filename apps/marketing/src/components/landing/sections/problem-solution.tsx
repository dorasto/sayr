import { Check, X, ArrowRight, Layers, MessageSquareText, Mail, ClipboardList, RotateCcw, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const painPoints = [
	{
		icon: Layers,
		title: "Scattered tools",
		description: "Your team's work lives in one tool. User feedback lives in another. They never talk to each other.",
	},
	{
		icon: RotateCcw,
		title: "Manual syncing",
		description: "You copy updates between tools, forward emails, and paste screenshots just to keep everyone in the loop.",
	},
	{
		icon: EyeOff,
		title: "Users left in the dark",
		description: 'Users submit feedback and hear nothing back. They ask "is this done yet?" because they can\'t see your board.',
	},
];

const sayrPoints = [
	{
		icon: ClipboardList,
		title: "One board, two views",
		description: "Your team sees everything. Users see what you allow. Same tool, same data.",
	},
	{
		icon: MessageSquareText,
		title: "Feedback becomes tasks",
		description: "Feature requests and bugs live as tasks. Mark them public or keep them private.",
	},
	{
		icon: Mail,
		title: "Automatic updates",
		description: "Status changes notify users. No manual copying, no drift between tools.",
	},
];

export function ProblemSolution() {
	return (
		<section className="py-24 px-6">
			<div className="max-w-(--breakpoint-lg) mx-auto">
				{/* Header */}
				<div className="text-center mb-16">
					<Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
						The Problem
					</Badge>
					<h2 className="text-3xl md:text-4xl font-semibold tracking-tight max-w-3xl mx-auto">
						Your team and your users shouldn't need{" "}
						<span className="text-muted-foreground">separate tools.</span>
					</h2>
					<p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
						Most teams juggle a project management tool and a separate feedback tool.
						That means duplicated work, stale updates, and users who never know what's happening.
					</p>
				</div>

				{/* Two-column: Pain vs Solution */}
				<div className="grid md:grid-cols-2 gap-8">
					{/* The problem side */}
					<div className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-6 md:p-8">
						<div className="flex items-center gap-2 mb-6">
							<div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center">
								<X className="size-4 text-destructive" />
							</div>
							<h3 className="text-lg font-semibold">The usual approach</h3>
						</div>
						<div className="space-y-5">
							{painPoints.map((point) => {
								const Icon = point.icon;
								return (
									<div key={point.title} className="flex gap-3">
										<div className="size-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
											<Icon className="size-4 text-destructive/70" />
										</div>
										<div>
											<p className="text-sm font-semibold mb-0.5">{point.title}</p>
											<p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* The Sayr side */}
					<div className="rounded-2xl border border-success/20 bg-success/[0.03] p-6 md:p-8">
						<div className="flex items-center gap-2 mb-6">
							<div className="size-8 rounded-full bg-success/10 flex items-center justify-center">
								<Check className="size-4 text-success" />
							</div>
							<h3 className="text-lg font-semibold">With Sayr</h3>
						</div>
						<div className="space-y-5">
							{sayrPoints.map((point) => {
								const Icon = point.icon;
								return (
									<div key={point.title} className="flex gap-3">
										<div className="size-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
											<Icon className="size-4 text-success/70" />
										</div>
										<div>
											<p className="text-sm font-semibold mb-0.5">{point.title}</p>
											<p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Bottom connector */}
				<div className="flex items-center justify-center mt-12 gap-3 text-muted-foreground">
					<span className="text-sm">Multiple disconnected tools</span>
					<ArrowRight className="size-4" />
					<span className="text-sm font-semibold text-foreground">One platform, full visibility</span>
				</div>
			</div>
		</section>
	);
}
