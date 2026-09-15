import { IconHome } from "@tabler/icons-react";
import { useLayoutData } from "@/components/admin/shell/context";
import { PageHeader } from "@/components/generic/PageHeader";
import { useLanderData } from "@/contexts/ContextLander";
import type { PendingInviteWithOrg } from "@/routes/(admin)/home/index";
import { PendingInvitesSection } from "./pending-invites";

/**
 * The new unified cross-org lander (SAY-73 Phase 1). This is a minimal stub —
 * the actual board (list/kanban, filters, saved views) is built incrementally
 * in apps/start/src/components/board/ over the following build-order steps.
 */
export default function AdminHomePage({ pendingInvites }: { pendingInvites: PendingInviteWithOrg[] }) {
	const { account, organizations } = useLayoutData();
	const { tasks, personalViews } = useLanderData();

	return (
		<div className="relative flex flex-col h-full">
			<PageHeader>
				<PageHeader.Identity icon={<IconHome className="size-4" />} title="Home" />
			</PageHeader>
			<div className="flex flex-col gap-4 p-4 max-w-6xl mx-auto w-full">
				<PendingInvitesSection invites={pendingInvites} />
				<p className="text-sm text-muted-foreground">
					Hi {account.displayName} — {tasks.length} task{tasks.length !== 1 ? "s" : ""} across{" "}
					{organizations.length} organization{organizations.length !== 1 ? "s" : ""}, {personalViews.length} saved
					view{personalViews.length !== 1 ? "s" : ""}. Board coming next.
				</p>
			</div>
		</div>
	);
}
