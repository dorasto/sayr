import type { schema } from "@repo/database";
import { useStateManagementFetch } from "@repo/ui/hooks/useStateManagement.ts";
import { formatTaskKey } from "@repo/util";
import { lazy, Suspense, useEffect } from "react";
import { Page } from "@/components/generic/page";
import { usePage, usePanel } from "@/components/generic/use-page";
import { PublicTaskPanelContent, PublicTaskPanelHeader } from "@/components/public/panels/task";
import { PublicTaskProvider, usePublicTask } from "@/contexts/ContextPublicOrgTask";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { PublicComments } from "./public-comments";

const Editor = lazy(() => import("@/components/prosekit/editor"));

export const PUBLIC_TASK_PANEL_ID = "public-task-panel";

interface PublicTaskContentProps {
	task: schema.TaskWithLabels;
	release?: schema.releaseType | null;
}

const baseApiUrl = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";

/**
 * Public (unauthenticated) task detail page: main content + a "Details" side
 * panel. All live task/vote/membership state lives in `PublicTaskProvider`
 * (apps/start/src/contexts/ContextPublicOrgTask.tsx) so both this component
 * and the panel (apps/start/src/components/public/panels/task.tsx) read from
 * context rather than one prop-drilling into the other.
 */
export function PublicTaskContent({ task: initialTask, release }: PublicTaskContentProps) {
	return (
		<PublicTaskProvider task={initialTask} release={release}>
			<PublicTaskContentInner />
		</PublicTaskProvider>
	);
}

function PublicTaskContentInner() {
	const { organization, tasks: contextTasks } = usePublicOrganizationLayout();
	const { task } = usePublicTask();
	const { setPanelContent } = usePage();
	const panel = usePanel(PUBLIC_TASK_PANEL_ID);

	// Fetch public tasks for this org if context tasks are empty (e.g., on direct task detail navigation) —
	// needed for the editor's #task mention list, not for the panel/content above.
	const {
		value: { data: fetchedTasks },
	} = useStateManagementFetch<schema.TaskWithLabels[]>({
		key: ["org-public-tasks", organization.id],
		fetch: {
			url: `${baseApiUrl}/v1/admin/organization/task/tasks?org_id=${organization.id}&limit=200&include_closed=true`,
			custom: async (url) => {
				const res = await fetch(url);
				if (!res.ok) return [];
				const json = await res.json();
				return json.data ?? [];
			},
		},
		staleTime: 1000 * 60 * 5,
		enabled: contextTasks.length === 0,
	});

	const tasks = contextTasks.length > 0 ? contextTasks : (fetchedTasks ?? []);

	// PublicTaskPanelContent pulls everything it needs from usePublicTask()/
	// usePublicOrganizationLayout() itself, so it only needs to be handed to
	// the panel once — it stays in sync on its own. Gated on isRegistered,
	// not just mount: Page defers registering the panel to its client-only
	// pass, so a plain `[]`-effect here would race it and silently no-op.
	useEffect(() => {
		if (!panel.isRegistered) return;
		setPanelContent(PUBLIC_TASK_PANEL_ID, <PublicTaskPanelContent />);
	}, [panel.isRegistered, setPanelContent]);

	return (
		<Page
			panels={{
				right: {
					id: PUBLIC_TASK_PANEL_ID,
					header: <PublicTaskPanelHeader />,
					defaultOpen: true,
					width: "380px",
				},
			}}
		>
			{/* Left pane: scrollable main content */}
			<div className="h-full overflow-y-auto">
				<div className="flex flex-col gap-4 p-6">
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-bold leading-tight">{task.title}</h1>
						<span className="text-muted-foreground text-sm">
							{formatTaskKey(organization.shortId, task.shortId)}
						</span>
					</div>

					{task.description && (
						<div className="prose prose-sm dark:prose-invert max-w-none">
							<Suspense fallback={<div className="h-20 animate-pulse bg-muted rounded" />}>
								<Editor readonly={true} defaultContent={task.description} tasks={tasks} hideBlockHandle />
							</Suspense>
						</div>
					)}

					<PublicComments
						taskId={task.id}
						organizationId={task.organizationId}
						taskStatus={task.status}
						tasks={tasks}
					/>
				</div>
			</div>
		</Page>
	);
}
