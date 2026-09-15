import { IconHome } from "@tabler/icons-react";
import { Board } from "@/components/board/board";
import { PageHeader } from "@/components/generic/PageHeader";
import { useLanderData } from "@/contexts/ContextLander";
import type { PendingInviteWithOrg } from "@/routes/(admin)/home/index";
import { PendingInvitesSection } from "./pending-invites";

/**
 * The new unified cross-org lander (SAY-73 Phase 1). Board rendering is
 * wired in, but the top bar / side panel / filter / saved-view assembly
 * around it is still incremental — build-order steps 7-9 flesh this out.
 */
export default function AdminHomePage({ pendingInvites }: { pendingInvites: PendingInviteWithOrg[] }) {
	const { tasks } = useLanderData();

	return (
		<div className="relative flex flex-col h-full min-h-0">
			<PageHeader>
				<PageHeader.Identity icon={<IconHome className="size-4" />} title="Home" />
			</PageHeader>
			<div className="flex flex-col gap-4 p-4 max-w-6xl mx-auto w-full">
				<PendingInvitesSection invites={pendingInvites} />
			</div>
			<div className="flex-1 min-h-0 overflow-auto px-4 pb-4 max-w-6xl mx-auto w-full">
				<Board tasks={tasks} />
			</div>
		</div>
	);
}
