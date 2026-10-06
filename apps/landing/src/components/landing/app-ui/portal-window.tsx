import { IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ORG } from "./demo-data";

interface PortalWindowProps {
	/** Which top-nav item is active. */
	active: "feedback" | "changelog";
	children: ReactNode;
	className?: string;
}

/**
 * The public portal's chrome as visitors see it at doras.sayr.io: the org's
 * mark and name, Feedback / Changelog, search, and the address bar.
 */
export function PortalWindow({ active, children, className }: PortalWindowProps) {
	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden rounded-xl border bg-background text-foreground text-sm shadow-2xl shadow-black/40",
				className
			)}
		>
			<div className="flex items-center gap-3 border-b bg-card/60 px-4 py-2 text-[11px] text-muted-foreground">
				<span className="flex gap-1.5" aria-hidden>
					<span className="size-2.5 rounded-full bg-muted-foreground/30" />
					<span className="size-2.5 rounded-full bg-muted-foreground/30" />
					<span className="size-2.5 rounded-full bg-muted-foreground/30" />
				</span>
				<span className="mx-auto rounded-md bg-muted px-3 py-0.5">{ORG.portal}</span>
				<span className="w-10" aria-hidden />
			</div>
			<div className="flex items-center gap-2 border-b px-4 py-2.5 text-[13px]">
				<span className="flex size-6 items-center justify-center rounded-md bg-primary font-bold text-[11px] text-primary-foreground">
					D
				</span>
				<span className="mr-3 font-semibold">{ORG.name}</span>
				{(["feedback", "changelog"] as const).map((item) => (
					<span
						key={item}
						className={cn(
							"rounded-md px-2 py-1 capitalize",
							item === active ? "bg-accent text-foreground" : "text-muted-foreground"
						)}
					>
						{item}
					</span>
				))}
				<span className="ml-auto hidden items-center gap-2 rounded-md border px-2 py-1 text-muted-foreground text-xs sm:flex">
					<IconSearch className="size-3.5" /> Search
					<kbd className="text-[10px]">⌘K</kbd>
				</span>
			</div>
			<div className="min-h-0 flex-1">{children}</div>
		</div>
	);
}
