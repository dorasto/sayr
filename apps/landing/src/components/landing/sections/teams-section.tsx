import { IconEyeOff, IconShieldCheck, IconUsersGroup } from "@tabler/icons-react";
import {
	MODERATION_STEPS,
	ModerationPanel,
	PERMISSIONS_STEPS,
	PermissionsPanel,
	VISIBILITY_STEPS,
	VisibilityPanel,
} from "../app-ui/team-panels";
import { ReplayCard, type ReplayCardItem } from "./replay-card";

const ITEMS: ReplayCardItem[] = [
	{
		name: "Teams and permissions",
		icon: IconUsersGroup,
		title: "Give each team exactly what it needs",
		text: "Put people in teams and switch on what each one can do. Members get every permission their teams grant, like roles on Discord.",
		link: { href: "/docs/organizations/members-and-teams", label: "Members and teams" },
		Visual: PermissionsPanel,
		steps: PERMISSIONS_STEPS,
	},
	{
		name: "Moderation",
		icon: IconShieldCheck,
		title: "Keep your public side tidy",
		text: "Moderators can edit or delete any comment, including on your public pages, without access to your settings.",
		link: { href: "/docs/organizations/members-and-teams#moderation-permissions", label: "Moderation permissions" },
		Visual: ModerationPanel,
		steps: MODERATION_STEPS,
	},
	{
		name: "Internal and public",
		icon: IconEyeOff,
		title: "Internal talk stays internal",
		text: "Tasks, labels and comments can each be private. Your team works in the same thread your users read, and they only see what you made public.",
		link: { href: "/docs/visibility/overview", label: "How visibility works" },
		Visual: VisibilityPanel,
		steps: VISIBILITY_STEPS,
	},
];

/**
 * Homepage strip: what makes Sayr safe to run a public side with a real team.
 * Only claims what ships today: submission approval and vote management are
 * still "coming soon" in team settings, so they aren't mentioned.
 */
export function TeamsSection() {
	return (
		<section className="px-6 py-24">
			<div className="mx-auto max-w-6xl">
				<div className="mx-auto max-w-2xl text-center">
					<p className="font-medium text-primary text-sm">For teams</p>
					<h2 className="mt-3 font-semibold text-3xl! tracking-tight md:text-4xl!">Built for real teams</h2>
					<p className="mt-4 text-muted-foreground">
						Decide who can do what, keep your public pages clean, and keep internal talk away from your users.
					</p>
				</div>
				<div className="mt-14 grid gap-4 lg:grid-cols-3">
					{ITEMS.map((item) => (
						<ReplayCard key={item.name} item={item} />
					))}
				</div>
			</div>
		</section>
	);
}
