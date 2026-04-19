import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { IconRocket } from "@tabler/icons-react";
import {
	RELEASE_STATUS_ORDER,
	getReleaseStatusConfig,
	type ReleaseStatusKey,
} from "@/components/releases/config";

type FilterTab = "all" | schema.releaseType["status"];

interface ReleasesFilterSidebarProps {
	releases: schema.releaseType[];
	activeFilter: FilterTab;
	onFilterChange: (filter: FilterTab) => void;
}

export function ReleasesFilterSidebar({
	releases,
	activeFilter,
	onFilterChange,
}: ReleasesFilterSidebarProps) {
	const totalCount = releases.filter((r) => r.status !== "archived").length;

	const statusCounts = RELEASE_STATUS_ORDER.map((status) => ({
		status,
		count: releases.filter((r) => r.status === status).length,
	})).filter(({ count }) => count > 0);

	return (
		<aside className="flex flex-col gap-1">
			{/* Header */}
			<div className="flex items-center gap-2 mb-3 px-1">
				<IconRocket className="size-4 text-muted-foreground" />
				<span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					Filter
				</span>
			</div>

			{/* All */}
			<FilterButton
				label="All Releases"
				count={totalCount}
				active={activeFilter === "all"}
				onClick={() => onFilterChange("all")}
			/>

			{/* Per status */}
			{statusCounts.map(({ status, count }) => {
				const cfg = getReleaseStatusConfig(status as ReleaseStatusKey);
				return (
					<FilterButton
						key={status}
						label={cfg?.label ?? status}
						count={count}
						active={activeFilter === status}
						color={cfg?.color}
						onClick={() => onFilterChange(status as FilterTab)}
					/>
				);
			})}
		</aside>
	);
}

interface FilterButtonProps {
	label: string;
	count: number;
	active: boolean;
	color?: string;
	onClick: () => void;
}

function FilterButton({ label, count, active, color, onClick }: FilterButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors",
				active
					? "bg-accent text-foreground font-medium"
					: "text-muted-foreground hover:text-foreground hover:bg-accent/50",
			)}
		>
			{color && (
				<span
					className="size-2 rounded-full shrink-0"
					style={{ backgroundColor: color }}
				/>
			)}
			<span className="flex-1 truncate">{label}</span>
			<span
				className={cn(
					"text-xs tabular-nums",
					active ? "text-foreground" : "text-muted-foreground/60",
				)}
			>
				{count}
			</span>
		</button>
	);
}
