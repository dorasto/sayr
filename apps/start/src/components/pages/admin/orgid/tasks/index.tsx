import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import { IconLayoutSidebarRight, IconLayoutSidebarRightFilled, IconUsers } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import { ADMIN_CAPABILITIES } from "@/components/board/core/capabilities";
import { isPlainLeftClick } from "@/components/board/core/open-item";
import type { BoardScope } from "@/components/board/core/scope-config";
import { TaskBoardProvider } from "@/components/board/core/task-board-provider";
import { FilterBuilder } from "@/components/board/filter/filter-builder";
import { useBoardViewState } from "@/components/board/filter/use-board-view-state";
import { BoardScrollArea } from "@/components/board/layout/board-scroll-area";
import { BoardViewOptions } from "@/components/board/layout/board-view-options";
import { TaskCountLabel } from "@/components/board/layout/task-count-label";
import { ActiveViewPanelHeader } from "@/components/board/saved-views/active-view-panel-header";
import { ActiveViewSwitcher } from "@/components/board/saved-views/active-view-switcher";
import { useOrgSavedViewsSource } from "@/components/board/saved-views/use-org-saved-views";
import { PageHeader } from "@/components/generic/PageHeader";
import { Page } from "@/components/generic/page";
import { usePage, usePanel } from "@/components/generic/use-page";
import { getTaskFieldPermissions } from "@/components/tasks/shared/task-field-toolbar-types";
import CreateIssueDialog from "@/components/tasks/task/creator";
import { TaskDetailDialog } from "@/components/tasks/task/task-detail-dialog";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useLayoutTasks } from "@/contexts/ContextOrgTasks";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { readClosedTasksPayload, replaceTask, upsertTask } from "@/lib/board/apply-lander-event";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import { userPreferencesStore } from "@/lib/stores/user-preferences-store";
import { OrgSettingsLink, OrgTasksPanelContent, useOrgTaskPresets } from "./org-tasks-panel";

const TASKS_LIST_PANEL_ID = "tasks-list-panel";

// The org page's tasks never carry the cross-org `.organization` badge, so nothing to attach.
const NO_ORG_SNAPSHOTS: ReadonlyMap<string, NonNullable<schema.TaskWithLabels["organization"]>> = new Map();

/**
 * An organization's tasks page, on the shared board (the same system /home uses — see the board skill):
 * `TaskBoardProvider` over the org's task store, the org's shared saved views in the breadcrumb switcher
 * (with "Your tasks" and per-category presets), the count tiles + quick filters in the side panel, and
 * the task dialog when the viewer prefers opening tasks in a dialog.
 */
export default function OrganizationTasksHomePage() {
	const { serverEvents, account } = useLayoutData();
	const {
		organization,
		setOrganization,
		labels,
		setLabels,
		views,
		setViews,
		categories,
		setCategories,
		releases,
		permissions,
	} = useLayoutOrganization();
	const { tasks, setTasks, updateTasks } = useLayoutTasks();
	const { canCreateResource, getLimitMessage } = usePlanLimits();
	const taskOpenMode = useStore(userPreferencesStore, (state) => state.taskOpenMode);

	// The task open in the dialog, by id — the record itself always comes from the live list, so the dialog
	// follows SSE/board edits and closes if the task disappears.
	const [dialogTaskId, setDialogTaskId] = useState<string | null>(null);
	const dialogTask = dialogTaskId ? (tasks.find((task) => task.id === dialogTaskId) ?? null) : null;
	const openTaskDialog = useCallback((task: schema.TaskWithLabels) => setDialogTaskId(task.id), []);

	// --- Live updates -----------------------------------------------------------------------------
	// While a task dialog is open, subscribe to that task's channel so UPDATE_TASK_COMMENTS arrives;
	// otherwise the org's tasks list channel.
	const sseChannel = dialogTaskId ? `task:${dialogTaskId}` : "tasks";
	useServerEventsSubscription({
		serverEvents,
		orgId: organization.id,
		organization,
		channel: sseChannel,
		setOrganization,
	});

	// Task-list handlers write through `updateTasks` (functional, latest list), never a list captured
	// from a render — an older render's `tasks` would undo whatever changed since.
	const handlers: WSMessageHandler<ServerEventMessage> = {
		CREATE_TASK: (msg) => {
			const created = msg.data;
			updateTasks((prev) => upsertTask(prev, created, NO_ORG_SNAPSHOTS));
		},
		UPDATE_TASK: (msg) => {
			const data: unknown = msg.data;
			// Publishing a release closes its tasks in bulk: `{ taskIds, status: "done" }`, not a task record.
			const closed = readClosedTasksPayload(data);
			if (closed) {
				const ids = new Set(closed.taskIds);
				updateTasks((prev) =>
					prev.some((task) => ids.has(task.id) && task.status !== closed.status)
						? prev.map((task) => (ids.has(task.id) ? { ...task, status: closed.status } : task))
						: prev
				);
				return;
			}
			const updatedTask = msg.data;
			if (!updatedTask?.id) return;
			updateTasks((prev) => replaceTask(prev, updatedTask));
			// When the task's dialog is open, forward timeline updates so its GlobalTimeline refetches.
			if (dialogTaskId && updatedTask.id === dialogTaskId) {
				sendWindowMessage(window, { type: "timeline-update", payload: updatedTask.id }, "*");
			}
		},
		UPDATE_TASK_COMMENTS: (msg) => {
			if (dialogTaskId && msg.data.id === dialogTaskId) {
				sendWindowMessage(window, { type: "timeline-update-comment", payload: msg.data.id }, "*");
			}
		},
		// The "tasks" room also receives vote broadcasts (see apps/backend/routes/api/internal/v1/task.ts).
		UPDATE_TASK_VOTE: (msg) => {
			const { id, voteCount } = msg.data;
			updateTasks((prev) =>
				prev.some((task) => task.id === id && task.voteCount !== voteCount)
					? prev.map((task) => (task.id === id ? { ...task, voteCount } : task))
					: prev
			);
		},
		UPDATE_LABELS: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setLabels(msg.data);
			}
		},
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setViews(msg.data);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId === organization.id) {
				setCategories(msg.data);
			}
		},
	};
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);
	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);

	// --- Board ------------------------------------------------------------------------------------
	const users = useMemo(() => organization.members.map((member) => member.user), [organization.members]);
	const permissionsByOrg = useMemo(() => ({ [organization.id]: permissions }), [organization.id, permissions]);
	const organizationScope = useMemo(
		() => ({ id: organization.id, shortId: organization.shortId }),
		[organization.id, organization.shortId]
	);
	// `?view`/`?filters` in the URL, with the org's shared saved views as the views `?view` resolves against.
	const boardScope = useMemo<BoardScope>(
		() => ({ key: `org:${organization.id}`, persistence: "url+personal" }),
		[organization.id]
	);
	const savedViews = useOrgSavedViewsSource({
		organizationId: organization.id,
		views,
		setViews,
		canCreate: canCreateResource("savedViews"),
		limitMessage: getLimitMessage("savedViews"),
	});

	return (
		<TaskBoardProvider
			tasks={tasks}
			updateTasks={updateTasks}
			labels={labels}
			categories={categories}
			releases={releases}
			users={users}
			permissions={permissionsByOrg}
			viewerId={account.id}
			organizationScope={organizationScope}
			capabilities={ADMIN_CAPABILITIES}
			scope={boardScope}
			savedViews={savedViews}
			openItem={openTaskDialog}
			openItemOnClick={taskOpenMode === "dialog"}
		>
			<OrganizationTasksBoardPage setTasks={setTasks} />
			<TaskDetailDialog
				task={dialogTask}
				open={dialogTask !== null}
				onOpenChange={(open) => {
					if (!open) setDialogTaskId(null);
				}}
				tasks={tasks}
				setTasks={setTasks}
				labels={labels}
				categories={categories}
				releases={releases}
				organization={organization}
				fieldPermissions={dialogTask ? getTaskFieldPermissions(dialogTask, account.id, permissions) : undefined}
			/>
		</TaskBoardProvider>
	);
}

/** The page chrome + board; inside the provider because the header/toolbar/panel read the board's state. */
function OrganizationTasksBoardPage({ setTasks }: { setTasks: (tasks: schema.TaskWithLabels[]) => void }) {
	const { organization, labels, releases, issueTemplates } = useLayoutOrganization();
	const { tasks } = useLayoutTasks();
	const { clearView } = useBoardViewState();
	const { all: presets } = useOrgTaskPresets();
	const { setPanelContent, closePanel } = usePage();
	const panel = usePanel(TASKS_LIST_PANEL_ID);
	const isMobile = useIsMobile();

	// OrgTasksPanelContent reads everything from the board's context and view state, so it only needs
	// handing to the panel once. Gated on isRegistered: Page registers the panel in its client-only pass.
	useEffect(() => {
		if (!panel.isRegistered) return;
		setPanelContent(TASKS_LIST_PANEL_ID, <OrgTasksPanelContent />);
	}, [panel.isRegistered, setPanelContent]);

	// The org breadcrumb is the page's "all tasks" link: a plain click clears the view in place (writing the
	// URL directly, like /home's Home button) instead of a same-route navigation; modifier clicks open a tab.
	const handleOrgClick = (event: MouseEvent<HTMLAnchorElement>) => {
		if (!isPlainLeftClick(event)) return;
		event.preventDefault();
		clearView();
	};

	const header = (
		<>
			<PageHeader.Identity
				actions={
					<div className="flex items-center gap-2">
						<CreateIssueDialog
							organization={organization}
							tasks={tasks}
							setTasks={setTasks}
							_labels={labels}
							issueTemplates={issueTemplates}
							releases={releases ?? []}
						/>
						<Button
							type="button"
							variant="accent"
							title={panel.isOpen ? "Close side panel" : "Open side panel"}
							className={cn(
								"gap-2 h-6 w-fit bg-accent border-transparent p-1",
								!panel.isOpen && "bg-transparent"
							)}
							onClick={() =>
								panel.isOpen
									? closePanel(TASKS_LIST_PANEL_ID)
									: sidebarActions.setOpen(TASKS_LIST_PANEL_ID, true)
							}
						>
							{panel.isOpen ? <IconLayoutSidebarRightFilled /> : <IconLayoutSidebarRight />}
						</Button>
					</div>
				}
			>
				{!isMobile && (
					<>
						<Link to="/$orgId/tasks" params={{ orgId: organization.id }} onClick={handleOrgClick}>
							<Button variant="primary" className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent" size="sm">
								<Avatar className="h-4 w-4">
									<AvatarImage
										src={organization.logo ? ensureCdnUrl(organization.logo) : ""}
										alt={organization.name}
									/>
									<AvatarFallback className="rounded-md uppercase text-xs">
										<IconUsers className="h-4 w-4" />
									</AvatarFallback>
								</Avatar>
								<span>{organization.name}</span>
							</Button>
						</Link>
						<span className="text-muted-foreground text-xs">/</span>
					</>
				)}
				<ActiveViewSwitcher presets={presets} />
			</PageHeader.Identity>
			<PageHeader.Toolbar
				className="border-b-0"
				left={<TaskCountLabel />}
				right={
					<>
						<FilterBuilder />
						<BoardViewOptions />
					</>
				}
			/>
		</>
	);

	return (
		<Page
			header={header}
			panels={{
				right: {
					id: TASKS_LIST_PANEL_ID,
					header: {
						icon: <ActiveViewPanelHeader />,
						actions: <OrgSettingsLink organizationId={organization.id} />,
						showClose: false,
					},
					defaultOpen: true,
					width: "420px",
				},
			}}
			className="h-full"
		>
			<div className="h-full flex flex-col contain-[paint]">
				<BoardScrollArea />
			</div>
		</Page>
	);
}
