// The ONLY file under components/board that touches the signed-in /home page's data
// (`useLanderData`). It is page-specific, so it is confined to this one adapter and the
// rest of the board reads `useBoardData()` / `useBoardItemActions()` instead. Everything
// else — the data source, the per-item field actions (and with them the board's one
// sanctioned import from components/tasks/**) — lives in the generic
// core/task-board-provider.tsx this wraps.
import { type ReactNode, useMemo } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { useLanderData } from "@/contexts/ContextLander";
import { ADMIN_CAPABILITIES } from "./capabilities";
import { TaskBoardProvider } from "./task-board-provider";

/** Mounts the board's data source from the /home lander context, with every capability on. */
export function AdminBoardProvider({ children }: { children: ReactNode }) {
	const { tasks, labels, categories, releases, updateTasks, permissionsByOrg } = useLanderData();
	const { account, organizations } = useLayoutData();
	// The sidebar's org order (the user's own, SAY-104), so group-by-org lists the orgs the same way.
	const organizationOrder = useMemo(() => organizations.map((org) => org.id), [organizations]);

	return (
		<TaskBoardProvider
			tasks={tasks}
			updateTasks={updateTasks}
			labels={labels}
			categories={categories}
			releases={releases}
			permissions={permissionsByOrg}
			viewerId={account.id}
			organizationOrder={organizationOrder}
			capabilities={ADMIN_CAPABILITIES}
		>
			{children}
		</TaskBoardProvider>
	);
}
