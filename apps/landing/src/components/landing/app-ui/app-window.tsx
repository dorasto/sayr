import SayrIcon from "@repo/ui/components/brand-icon";
import {
	IconBookmark,
	IconHome,
	IconInbox,
	IconLayoutSidebarRight,
	IconLoader,
	IconRocket,
	IconSettings,
	IconStack2,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ORG } from "./demo-data";

const NAV = [
	{ id: "tasks", label: "Tasks", icon: IconLoader },
	{ id: "views", label: "Views", icon: IconStack2 },
	{ id: "releases", label: "Releases", icon: IconRocket },
	{ id: "manage", label: "Manage", icon: IconSettings },
] as const;

export type AppSection = (typeof NAV)[number]["id"];

interface AppWindowProps {
	/** Which org nav item is highlighted. */
	active?: AppSection;
	/** Breadcrumb trail shown in the page header, e.g. ["Tasks"] or ["Releases", "v2.4"]. */
	crumbs: string[];
	/** Right-hand header slot (view switcher, toggles). */
	actions?: ReactNode;
	/** Hide the sidebar for compact recreations. */
	compact?: boolean;
	children: ReactNode;
	className?: string;
}

/**
 * The admin app's chrome, recreated in HTML: sidebar with the org's
 * Tasks / Views / Releases / Manage, and the h-11 page header with
 * breadcrumbs. Purely presentational (aria-hidden at the call site's
 * discretion); every recreation renders inside it.
 */
export function AppWindow({ active = "tasks", crumbs, actions, compact = false, children, className }: AppWindowProps) {
	return (
		<div
			className={cn(
				"flex overflow-hidden rounded-xl border bg-sidebar text-foreground text-sm shadow-2xl shadow-black/40",
				className
			)}
		>
			{!compact && (
				<aside className="hidden w-52 shrink-0 flex-col gap-0.5 p-2 text-[13px] md:flex">
					<div className="mb-2 flex items-center gap-2 px-2 py-1.5 font-medium">
						<SayrIcon className="size-4" />
						{ORG.name}
					</div>
					<span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground">
						<IconHome className="size-4" /> Dashboard
					</span>
					<span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground">
						<IconInbox className="size-4" /> Inbox
						<span className="ml-auto rounded bg-primary/15 px-1.5 text-[10px] text-primary">3</span>
					</span>
					<span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground">
						<IconBookmark className="size-4" /> Favourites
					</span>
					<p className="mt-3 px-2 pb-1 text-[11px] text-muted-foreground/70">{ORG.name}</p>
					{NAV.map((item) => (
						<span
							key={item.id}
							className={cn(
								"flex items-center gap-2 rounded-md px-2 py-1.5",
								item.id === active ? "bg-accent text-foreground" : "text-muted-foreground"
							)}
						>
							<item.icon className="size-4" /> {item.label}
						</span>
					))}
				</aside>
			)}
			<div className={cn("flex min-w-0 flex-1 flex-col bg-background", !compact && "md:my-2 md:mr-2 md:rounded-lg")}>
				<div className="flex h-11 shrink-0 items-center gap-2 border-b px-3 text-xs">
					<SayrIcon className="size-3.5" />
					<span className="text-muted-foreground">{ORG.name}</span>
					{crumbs.map((crumb) => (
						<span key={crumb} className="flex items-center gap-2">
							<span className="text-muted-foreground/60">/</span>
							<span className="font-medium">{crumb}</span>
						</span>
					))}
					<div className="ml-auto flex items-center gap-1">
						{actions}
						<IconLayoutSidebarRight className="size-4 text-muted-foreground" />
					</div>
				</div>
				<div className="min-h-0 flex-1">{children}</div>
			</div>
		</div>
	);
}
