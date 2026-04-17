import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { IconArchive, IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
	getReleaseStatusConfig,
	type ReleaseStatusKey,
} from "@/components/releases/config";
import { ReleaseCard } from "./release-card";

interface ReleaseGroupProps {
	status: ReleaseStatusKey;
	releases: schema.releaseType[];
	orgSlug: string;
	defaultOpen?: boolean;
}

export function ReleaseGroup({
	status,
	releases,
	orgSlug,
	defaultOpen = true,
}: ReleaseGroupProps) {
	const [open, setOpen] = useState(defaultOpen);
	const cfg = getReleaseStatusConfig(status);
	const isArchived = status === "archived";

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex items-center gap-2.5 w-full text-left mb-4 group",
						"hover:text-foreground transition-colors",
					)}
				>
					{/* Status dot */}
					<div
						className="size-2.5 rounded-full shrink-0"
						style={{ backgroundColor: cfg?.color ?? "#6B7280" }}
					/>

					{isArchived && (
						<IconArchive className="h-3.5 w-3.5 text-muted-foreground" />
					)}

					<span
						className={cn(
							"text-xs font-bold uppercase tracking-widest",
							isArchived ? "text-muted-foreground" : "",
							cfg?.className,
						)}
					>
						{cfg?.label ?? status}
					</span>

					<span className="text-xs text-muted-foreground font-normal">
						({releases.length})
					</span>

					<IconChevronDown
						className={cn(
							"h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform duration-200",
							!open && "-rotate-90",
						)}
					/>
				</button>
			</CollapsibleTrigger>

		<CollapsibleContent>
			<div className={cn("flex flex-col", isArchived && "opacity-60")}>
				{releases.map((release, i) => (
					<ReleaseCard
						key={release.id}
						release={release}
						orgSlug={orgSlug}
						lineColor={cfg?.color}
						isLast={i === releases.length - 1}
					/>
				))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
