import type { schema } from "@repo/database";
import { useState } from "react";
import { RELEASE_STATUS_ORDER, type ReleaseStatusKey } from "@/components/releases/config";
import { ReleaseGroup } from "./release-group";
import { ReleasesFilterSidebar } from "./releases-filter-sidebar";

type FilterTab = "all" | schema.releaseType["status"];

interface ReleasesChangelogProps {
	releases: schema.releaseType[];
	orgSlug: string;
}

export function ReleasesChangelog({ releases, orgSlug }: ReleasesChangelogProps) {
	const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

	const filtered =
		activeFilter === "all"
			? releases
			: releases.filter((r) => r.status === activeFilter);

	const nonArchived = filtered.filter((r) => r.status !== "archived");
	const archived = filtered.filter((r) => r.status === "archived");

	const grouped = (RELEASE_STATUS_ORDER as string[]).filter((s) => s !== "archived").map(s => s as Exclude<ReleaseStatusKey, "archived">)
		.map((status) => ({
			status,
			releases: nonArchived.filter((r) => r.status === status),
		}))
		.filter((g) => g.releases.length > 0);

	return (
		<div className="flex gap-8 md:gap-12 items-start">
			{/* Desktop filter sidebar */}
			<div className="hidden md:block w-44 shrink-0 sticky top-6">
				<ReleasesFilterSidebar
					releases={releases}
					activeFilter={activeFilter}
					onFilterChange={setActiveFilter}
				/>
			</div>

			{/* Main changelog content */}
			<div className="flex-1 min-w-0">
				{/* Mobile filter pills */}
				<div className="flex md:hidden gap-2 overflow-x-auto pb-3 mb-4 -mx-3 px-3 scrollbar-none">
					<MobileFilterPill
						label="All"
						active={activeFilter === "all"}
						onClick={() => setActiveFilter("all")}
					/>
					{RELEASE_STATUS_ORDER.map((status) => {
						const count = releases.filter((r) => r.status === status).length;
						if (count === 0) return null;
						const labels: Record<string, string> = {
							planned: "Planned",
							"in-progress": "In Progress",
							released: "Released",
							archived: "Archived",
						};
						return (
							<MobileFilterPill
								key={status}
								label={labels[status] ?? status}
								active={activeFilter === status}
								onClick={() => setActiveFilter(status as FilterTab)}
							/>
						);
					})}
				</div>

				{/* Groups */}
				<div className="flex flex-col gap-8">
					{grouped.map(({ status, releases: groupReleases }) => (
						<ReleaseGroup
							key={status}
							status={status as ReleaseStatusKey}
							releases={groupReleases}
							orgSlug={orgSlug}
							defaultOpen={true}
						/>
					))}

					{archived.length > 0 && (
						<ReleaseGroup
							status="archived"
							releases={archived}
							orgSlug={orgSlug}
							defaultOpen={false}
						/>
					)}
				</div>

				{filtered.length === 0 && (
					<p className="text-sm text-muted-foreground py-8 text-center">
						No releases match this filter.
					</p>
				)}
			</div>
		</div>
	);
}

function MobileFilterPill({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={
				active
					? "shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-foreground text-background"
					: "shrink-0 px-3 py-1 rounded-full text-xs border border-border text-muted-foreground hover:text-foreground"
			}
		>
			{label}
		</button>
	);
}
