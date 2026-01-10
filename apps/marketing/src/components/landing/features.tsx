import { Eye, Filter, GitBranch, Globe, MessageSquareText, ShieldCheck } from "lucide-react";

const features = [
	{
		icon: Eye,
		title: "Hybrid Visibility",
		description:
			"Seamlessly blend public collaboration with internal privacy. Toggle visibility for tasks, comments, and fields.",
	},
	{
		icon: Globe,
		title: "Public Portal",
		description:
			"Let customers submit bugs and feature requests directly. Keep them in the loop without granting full access.",
	},
	{
		icon: MessageSquareText,
		title: "Unified Timeline",
		description:
			"View internal discussions and public comments in one continuous timeline. Never lose context again.",
	},
	{
		icon: Filter,
		title: "Power Filters",
		description:
			"Find exactly what you need with granular filters. Search by status, assignee, priority, and more with smart operators.",
	},
	{
		icon: ShieldCheck,
		title: "Granular Control",
		description:
			"Role-based access control with team-specific permissions. Manage who can see, edit, or delete at a granular level.",
	},
	{
		icon: GitBranch,
		title: "Code Integration",
		description: "Link issues directly to GitHub PRs and branches. Keep your code and project management in sync.",
	},
];

const Features = () => {
	return (
		<div className="flex items-center justify-center py-12">
			<div>
				<h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center">
					Designed for internal teams & customers to interact seamlessly
				</h2>
				<div className="mt-10 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-(--breakpoint-lg) mx-auto px-6">
					{features.map((feature) => (
						<div key={feature.title} className="flex flex-col border rounded-xl py-6 px-5">
							<div className="mb-4 h-10 w-10 flex items-center justify-center bg-muted rounded-full">
								<feature.icon className="size-5" />
							</div>
							<span className="text-lg font-semibold">{feature.title}</span>
							<p className="mt-1 text-foreground/80 text-[15px]">{feature.description}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default Features;
