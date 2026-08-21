import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import SimpleClipboard from "@repo/ui/components/tomui/simple-clipboard";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconExternalLink, IconLink } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLayoutData } from "@/components/admin/shell/context";
import type { MentionContext } from "@/hooks/useMentionUsers";
import { getTaskRelationsAction } from "@/lib/fetches/task";
import { TaskFieldToolbar, type FieldPermissions } from "../shared";
import { deriveAvailableUsers, deriveIsProjectAdmin, type TaskDetailOrganization } from "../types";
import { TaskEditableHeader } from "./editable-header";
import { AiInsights } from "./task-ai-insights";
import { TaskContextBanner } from "./task-context-banner";
import GlobalTimeline from "./timeline/root";

export interface TaskDetailCompactProps {
	task: schema.TaskWithLabels;
	tasks: schema.TaskWithLabels[];
	setTasks: (tasks: schema.TaskWithLabels[]) => void;
	setSelectedTask: (task: schema.TaskWithLabels | null) => void;
	labels: schema.labelType[];
	categories: schema.categoryType[];
	releases?: schema.releaseType[];
	/** Extra elements rendered at the end of the toolbar (e.g. expand toggle) */
	toolbarExtra?: ReactNode;
	/**
	 * Optional organization for richer functionality.
	 * When an `OrganizationWithMembers` is passed, the component derives
	 * `availableUsers` from its members. Otherwise it falls back to
	 * `task.assignees` (cross-org mode).
	 *
	 * Also used for clipboard slug and display links when available;
	 * falls back to `task.organization` when absent.
	 */
	organization?: TaskDetailOrganization;
	/** Per-field editability flags for cross-org views */
	fieldPermissions?: FieldPermissions;
}

/**
 * Compact task detail view used in dialogs and inbox panels.
 * Renders a toolbar + editable header + timeline in a single column.
 * Filters labels/categories/releases by the task's organizationId for cross-org support.
 */
export function TaskDetailCompact({
	task,
	tasks,
	setTasks,
	setSelectedTask,
	labels,
	categories,
	releases = [],
	toolbarExtra,
	organization,
	fieldPermissions,
}: TaskDetailCompactProps) {
	const { setValue: setMentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
	const { account } = useLayoutData();

	// Resolve the organization to use for display / clipboard / mention context.
	// Prefer the explicit prop; fall back to the minimal shape on `task.organization`.
	const resolvedOrg = organization ?? task.organization;

	// Set mentionContext so the Editor's useMentionUsers hook can fetch org members and task participants
	useEffect(() => {
		if (task.organizationId) {
			setMentionContext({ orgId: task.organizationId, orgShortId: resolvedOrg?.shortId, taskId: task.id });
		}
	}, [task.organizationId, resolvedOrg?.shortId, task.id, setMentionContext]);

	// List-sourced tasks (the `tasks` array backing UnifiedTaskView / inbox) never
	// carry `relations` — only the main task page's single-task fetch does. Fetch
	// them here so TaskContextBanner's "Related to"/"Blocking"/"Duplicate of" rows
	// aren't silently empty in this compact/dialog view.
	const [fetchedRelations, setFetchedRelations] = useState<schema.TaskRelationWithTarget[] | undefined>(undefined);
	useEffect(() => {
		// Drop any relations fetched for a previously displayed task — this
		// component is reused across consecutive tasks in the dialog/side panel,
		// so without this a task switch briefly (or permanently, if the new task
		// already has task.relations) shows the previous task's related tasks.
		setFetchedRelations(undefined);
		if (task.relations !== undefined) return;
		let cancelled = false;
		getTaskRelationsAction(task.organizationId, task.id)
			.then((res) => {
				if (!cancelled && res.success && res.data) {
					setFetchedRelations(res.data);
				}
			})
			.catch(() => {
				// Relations stay hidden — the banner simply omits the rows.
			});
		return () => {
			cancelled = true;
		};
	}, [task.id, task.organizationId, task.relations]);
	const taskWithRelations =
		task.relations === undefined && fetchedRelations ? { ...task, relations: fetchedRelations } : task;

	// Get labels and categories for this task's organization
	const orgLabels = labels.filter((l) => l.organizationId === task.organizationId);
	const orgCategories = categories.filter((c) => c.organizationId === task.organizationId);
	const orgReleases = releases.filter((r) => r.organizationId === task.organizationId);

	// Derive available users: full member list when OrganizationWithMembers is
	// provided, otherwise fall back to the task's existing assignees.
	const availableUsers = deriveAvailableUsers(resolvedOrg, task);

	// AiInsights' admin-only "keep it reachable even when empty" behavior —
	// false (not thrown) when only a MinimalOrganization is available, same
	// cross-org fallback shape as availableUsers above.
	const isProjectAdmin = deriveIsProjectAdmin(resolvedOrg, account?.id);

	return (
		<div className="flex flex-col h-full">
			{/* Toolbar */}
			<div className="flex items-center gap-1 p-3 h-auto shrink-0 border-b overflow-x-auto">
				<TaskFieldToolbar
					task={task}
					variant="compact"
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					categories={orgCategories}
					releases={orgReleases}
					availableLabels={orgLabels}
					availableUsers={availableUsers}
					organization={resolvedOrg}
					fieldPermissions={fieldPermissions}
					fields={[
						{
							key: "identifier",
							compact: true,
						},
						{
							key: "status",
							iconOnly: true,
						},
						{
							key: "visibility",
							compact: true,
						},
						"priority",
						{ key: "labels", compact: true },
						{ key: "assignees", compact: true },
						"category",
						"release",

						"vote",
						{ key: "githubIssue", iconOnly: true },
						{ key: "githubPr", iconOnly: true },
					]}
				/>
				<Link
					to="/$orgId/tasks/$taskShortId"
					params={{ orgId: task.organizationId, taskShortId: String(task.shortId) }}
					className="w-fit"
				>
					<Button variant="ghost" size="icon" className="h-7 w-7" tooltipText="Open in full view">
						<IconExternalLink className="size-4" />
					</Button>
				</Link>
				<SimpleClipboard
					textToCopy={`https://${resolvedOrg?.slug}.${import.meta.env.VITE_ROOT_DOMAIN}/${task.shortId}`}
					variant="ghost"
					className="h-7 p-1 w-fit"
					copyIcon={<IconLink className="size-4" />}
					tooltipText="Copy task URL"
					tooltipSide="bottom"
				/>

				{toolbarExtra}
			</div>
			<div className="flex-1 overflow-y-auto p-4 pb-0 flex flex-col gap-6 *:h-auto">
				<TaskEditableHeader
					task={task}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					categories={orgCategories}
					organization={resolvedOrg}
					showContent="both"
					canEdit={fieldPermissions?.category}
				/>
				<TaskContextBanner
					task={taskWithRelations}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					organization={resolvedOrg}
				/>
				<AiInsights
					task={task}
					orgId={task.organizationId}
					availableLabels={orgLabels}
					availableUsers={availableUsers}
					categories={orgCategories}
					releases={orgReleases}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					isProjectAdmin={isProjectAdmin}
				/>
				<GlobalTimeline
					task={task}
					labels={orgLabels}
					availableUsers={availableUsers}
					categories={orgCategories}
					tasks={tasks}
					releases={orgReleases}
					organization={resolvedOrg}
				/>
			</div>
		</div>
	);
}
