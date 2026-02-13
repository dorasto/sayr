import { Users, Shield, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
	{
		step: "01",
		title: "Users submit feedback",
		description:
			"Customers visit your public portal, browse existing tasks, and submit bug reports or feature requests. They can vote on items that matter to them and leave public comments.",
		icon: Users,
	},
	{
		step: "02",
		title: "Your team triages internally",
		description:
			"Your team reviews submissions, adds internal comments, assigns priorities, links GitHub branches, and keeps private tasks hidden — all invisible to external users.",
		icon: Shield,
	},
	{
		step: "03",
		title: "Ship and update publicly",
		description:
			"As work progresses, status changes are visible on the public portal. Users are notified when their requests are resolved. Full transparency without any extra effort.",
		icon: Zap,
	},
];

export function HowItWorks() {
	return (
		<section className="py-24 px-6">
			<div className="max-w-(--breakpoint-lg) mx-auto">
				<div className="text-center mb-16">
					<Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
						How It Works
					</Badge>
					<h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
						Three steps to{" "}
						<span className="text-primary">transparent collaboration</span>
					</h2>
				</div>
				<div className="grid md:grid-cols-3 gap-8">
					{steps.map((s, i) => (
						<div key={s.step} className="relative">
							{i < steps.length - 1 && (
								<div className="hidden md:block absolute top-12 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px border-t border-dashed border-border" />
							)}
							<div className="flex flex-col items-center text-center">
								<div className="relative mb-6">
									<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
										<s.icon className="size-7" />
									</div>
									<span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
										{s.step}
									</span>
								</div>
								<h3 className="text-lg font-semibold mb-2">{s.title}</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
