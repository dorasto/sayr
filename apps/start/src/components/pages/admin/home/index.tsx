import { IconHome } from "@tabler/icons-react";
import { Board } from "@/components/board/board";
import { FilterBuilder } from "@/components/board/filter/filter-builder";
import { QuickFilterChips } from "@/components/board/quick-filters/quick-filter-chips";
import { PageHeader } from "@/components/generic/PageHeader";
import { useLanderData } from "@/contexts/ContextLander";
import type { PendingInviteWithOrg } from "@/routes/(admin)/home/index";
import { PendingInvitesSection } from "./pending-invites";

/**
 * The new unified cross-org lander (SAY-73 Phase 1). Toolbar (filter
 * builder + quick filters) lives in PageHeader.Toolbar's left slot —
 * same placement every other admin page uses for TaskFilterDropdown (see
 * the page-header skill's "Cross-org task list (My Tasks)" pattern) — not
 * inside Board itself. The side panel / saved-view / layout-toggle
 * assembly around this is still incremental (step 9).
 */
export default function AdminHomePage({ pendingInvites }: { pendingInvites: PendingInviteWithOrg[] }) {
	const { tasks } = useLanderData();

	return (
		<div className="relative flex flex-col h-full min-h-0">
			<PageHeader>
				<PageHeader.Identity icon={<IconHome className="size-4" />} title="Home" />
				<PageHeader.Toolbar
					left={
						<div className="flex items-center gap-2 flex-wrap max-w-full overflow-x-auto">
							<FilterBuilder />
							<div className="h-4 w-px bg-border shrink-0" />
							<QuickFilterChips />
						</div>
					}
				/>
			</PageHeader>
			<PendingInvitesSection invites={pendingInvites} />
			<div className="flex-1 min-h-0 overflow-auto px-4 pb-4 max-w-6xl mx-auto w-full">
				<Board tasks={tasks} />
			</div>
		</div>
	);
}
