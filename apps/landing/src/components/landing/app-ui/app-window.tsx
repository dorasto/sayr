import {
	IconBookmark,
	IconBuilding,
	IconChevronDown,
	IconHome,
	IconInbox,
	IconLayoutKanban,
	IconLayoutSidebar,
	IconLayoutSidebarRight,
	IconPlus,
	IconProgress,
	IconQuestionMark,
	IconRocket,
	IconSearch,
	IconSettings,
	IconSparkles,
	IconStack2,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OrgMark } from "./atoms";
import { ORG } from "./demo-data";

const ORG_NAV = [
	{ id: "tasks", label: "Tasks", icon: IconProgress },
	{ id: "views", label: "Views", icon: IconStack2 },
	{ id: "releases", label: "Releases", icon: IconRocket },
	{ id: "manage", label: "Manage", icon: IconSettings },
] as const;

/** Saved views pinned to Favourites, each with its coloured icon square. */
const FAVOURITES = [
	{ label: "Bugs this week", icon: IconBookmark, tint: "bg-amber-500/15 text-amber-500" },
	{ label: "Roadmap", icon: IconLayoutKanban, tint: "bg-green-500/15 text-green-500" },
];

export type AppSection = (typeof ORG_NAV)[number]["id"];

function NavItem({ icon, label, active = false }: { icon: ReactNode; label: string; active?: boolean }) {
	return (
		<span
			className={cn(
				"flex h-7 items-center gap-2 rounded-lg px-2",
				active ? "bg-accent text-foreground" : "text-muted-foreground"
			)}
		>
			{icon}
			<span className="truncate">{label}</span>
		</span>
	);
}

/** The admin sidebar (apps/start/src/components/admin/sidebars/primary*.tsx). */
function Sidebar({ active }: { active: AppSection }) {
	return (
		<aside className="hidden w-48 shrink-0 flex-col gap-0.5 p-2 text-[13px] md:flex">
			<div className="flex items-center gap-0.5">
				<span className="flex h-7 flex-1 items-center gap-2 rounded-lg px-2 text-muted-foreground">
					<IconHome className="size-4" /> Dashboard
				</span>
				<span className="grid size-7 place-items-center text-muted-foreground">
					<IconSearch className="size-4" />
				</span>
				<span className="grid size-7 place-items-center text-primary">
					<IconPlus className="size-4" />
				</span>
			</div>
			<NavItem icon={<IconInbox className="size-4" />} label="Inbox" />
			<span className="flex h-7 items-center gap-2 rounded-lg px-2 text-muted-foreground">
				<IconBookmark className="size-4" /> Favourites
				<IconChevronDown className="ml-auto size-3.5" />
			</span>
			{FAVOURITES.map((favourite) => (
				<span key={favourite.label} className="flex h-7 items-center gap-2 rounded-lg px-2 text-muted-foreground">
					<span className={cn("grid size-4 place-items-center rounded", favourite.tint)}>
						<favourite.icon className="size-3" />
					</span>
					<span className="truncate">{favourite.label}</span>
				</span>
			))}
			<span className="flex h-7 items-center gap-2 rounded-lg px-2 text-muted-foreground">
				<IconBuilding className="size-4" /> Organizations
				<IconChevronDown className="ml-auto size-3.5" />
			</span>
			<span className="flex h-7 items-center gap-2 rounded-lg px-2 text-foreground">
				<OrgMark className="size-4 rounded-md text-[9px]" />
				<span className="truncate">{ORG.name}</span>
				<IconSparkles className="size-3.5 text-primary" />
			</span>
			<div className="ml-2 flex flex-col gap-0.5 border-l pl-2">
				{ORG_NAV.map((item) => (
					<NavItem
						key={item.id}
						icon={<item.icon className="size-4" />}
						label={item.label}
						active={item.id === active}
					/>
				))}
			</div>
			<NavItem icon={<IconPlus className="size-4" />} label="Create" />
			<div className="mt-auto flex flex-col gap-0.5">
				<NavItem icon={<IconLayoutSidebar className="size-4" />} label="Collapse" />
				<NavItem icon={<IconQuestionMark className="size-4" />} label="Feedback" />
			</div>
		</aside>
	);
}

interface AppWindowProps {
	/** Which org nav item is highlighted. */
	active?: AppSection;
	/** Breadcrumb trail after the org, e.g. ["Tasks"] or ["Releases", "v2.4"]. */
	crumbs: string[];
	/** A line under the header, like the board's "24 tasks" readout. */
	toolbar?: ReactNode;
	/** Hide the sidebar for compact recreations. */
	compact?: boolean;
	children: ReactNode;
	className?: string;
}

/**
 * The admin app's chrome, recreated in HTML: the sidebar (Dashboard, Inbox,
 * Favourites, the org with its nested nav, Create) and the inset page with
 * its h-11 breadcrumb header. Every app recreation renders inside it.
 */
export function AppWindow({ active = "tasks", crumbs, toolbar, compact = false, children, className }: AppWindowProps) {
	return (
		<div
			className={cn(
				"flex overflow-hidden rounded-xl border bg-sidebar text-foreground text-sm shadow-2xl shadow-black/40",
				className
			)}
		>
			{!compact && <Sidebar active={active} />}
			<div
				className={cn(
					"flex min-w-0 flex-1 flex-col overflow-hidden bg-background",
					!compact && "md:my-2 md:mr-2 md:rounded-lg md:border"
				)}
			>
				<div className="flex h-11 shrink-0 items-center gap-2 border-b px-3 text-xs">
					<OrgMark className="size-4 rounded-md text-[9px]" />
					<span className="text-muted-foreground">{ORG.name}</span>
					{crumbs.map((crumb) => (
						<span key={crumb} className="flex items-center gap-2">
							<span className="text-muted-foreground/60">/</span>
							<span className="font-medium">{crumb}</span>
						</span>
					))}
					<IconLayoutSidebarRight className="ml-auto size-4 text-muted-foreground" />
				</div>
				{toolbar && <div className="shrink-0 px-5 pt-3 text-muted-foreground text-xs">{toolbar}</div>}
				<div className="min-h-0 flex-1">{children}</div>
			</div>
		</div>
	);
}
