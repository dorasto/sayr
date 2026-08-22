import type { schema } from "@repo/database";
import { Tile, TileAction, TileHeader, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { useReadOnlyStateManagementKey } from "@repo/ui/hooks/useStateManagement.ts";
import { IconExternalLink, IconPlug } from "@tabler/icons-react";
import { useLayoutData } from "@/components/admin/shell/context";
import { SubWrapper } from "@/components/generic/wrapper";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import type { useToastAction } from "@/lib/util";
import { cn } from "@/lib/utils";
import { getMatchedIntegrations, InlineLabel, TaskFieldToolbar, getTaskFieldPermissions } from "../shared";
import GlobalTaskAssignees from "../shared/assignee";
import GlobalTaskGithubIssue from "../shared/github-issue";
import GlobalTaskLabels from "../shared/label";
import { TaskEditableHeader } from "./editable-header";
import { AiInsights } from "./task-ai-insights";
import { TaskContextBanner } from "./task-context-banner";
import { TaskParentSection, TaskRelationsSection, TaskSubtasksSection } from "./task-hierarchy-sections";
import GlobalTimeline from "./timeline/root";

interface TaskContentSideContentProps {
	task: schema.TaskWithLabels;
	labels: schema.labelType[];
	tasks: schema.TaskWithLabels[];
	setTasks: (newValue: schema.TaskWithLabels[]) => void;
	setSelectedTask: (newValue: schema.TaskWithLabels | null) => void;
	availableUsers?: schema.userType[];
	sseClientId: string;
	runWithToast: typeof useToastAction extends () => { runWithToast: infer T } ? T : never;
	categories: schema.categoryType[];
	releases: schema.releaseType[];
	organization: schema.OrganizationWithMembers;
	/** If true, shows an inline "Create label" form when no labels match search */
	canCreateLabel?: boolean;
}

export function TaskContentSideContent({
	task,
	labels,
	tasks,
	setTasks,
	setSelectedTask,
	availableUsers = [],
	sseClientId,
	runWithToast,
	categories,
	releases = [],
	organization,
	canCreateLabel = false,
}: TaskContentSideContentProps) {
	const { setLabels, permissions } = useLayoutOrganization();
	const { account } = useLayoutData();
	const fieldPerms = getTaskFieldPermissions(task, account?.id, permissions);
	const { value: activity }: any = useReadOnlyStateManagementKey([
		"timeline",
		"activity",
		task.id,
		task.organizationId,
	]);
	const integrationActivities = activity?.filter((e: any) => e.eventType === "integration");
	const matchedIntegrations = getMatchedIntegrations(integrationActivities ?? []);

	return (
		<div className="flex flex-col gap-3 w-full">
			<div className="p-1 pt-3 flex flex-col gap-2 max-w-full md:max-w-1/2">
				<TaskFieldToolbar
					task={task}
					variant="sidebar"
					fieldPermissions={fieldPerms}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					categories={categories}
					releases={releases}
					availableLabels={labels}
					availableUsers={availableUsers}
					fields={["vote", "status", "priority", "category", "visibility", "release", "githubIssue", "githubPr"]}
				/>
			</div>

			<div className="p-1 flex flex-col gap-2 max-w-full">
				<Tile className="md:w-full items-start p-0 flex-col gap-1" variant={"transparent"}>
					<TileHeader>
						<TileTitle asChild>
							<Label variant={"description"} className="text-xs">
								Assigned to
							</Label>
						</TileTitle>
					</TileHeader>
					<TileAction>
						<GlobalTaskAssignees
							className="bg-transparent p-1 h-auto"
							task={task}
							showChevron={false}
							editable={fieldPerms.assignees ?? true}
							availableUsers={availableUsers}
							tasks={tasks}
							setTasks={setTasks}
							setSelectedTask={setSelectedTask}
							showLabel={false}
						/>
					</TileAction>
				</Tile>
			</div>
			<div className="p-1 flex flex-col gap-2 max-w-full">
				<Tile className="md:w-full items-start p-0 flex-col gap-1" variant={"transparent"}>
					<TileHeader>
						<TileTitle asChild>
							<Label variant={"description"} className="text-xs">
								Labels
							</Label>
						</TileTitle>
					</TileHeader>
					<TileAction>
						<GlobalTaskLabels
							showLabel={false}
							task={task}
							editable={fieldPerms.labels ?? true}
							availableLabels={labels}
							canCreateLabel={canCreateLabel}
							onLabelCreated={(newLabels) => {
								setLabels(newLabels);
							}}
							tasks={tasks}
							setTasks={setTasks}
							setSelectedTask={setSelectedTask}
						/>
					</TileAction>
				</Tile>
			</div>
			<TaskParentSection
				task={task}
				tasks={tasks}
				setTasks={setTasks}
				setSelectedTask={setSelectedTask}
				sseClientId={sseClientId}
				runWithToast={runWithToast}
				orgShortId={organization.shortId}
			/>
			<TaskSubtasksSection
				task={task}
				tasks={tasks}
				setTasks={setTasks}
				setSelectedTask={setSelectedTask}
				sseClientId={sseClientId}
				runWithToast={runWithToast}
				orgShortId={organization.shortId}
			/>
			<TaskRelationsSection
				task={task}
				tasks={tasks}
				setTasks={setTasks}
				setSelectedTask={setSelectedTask}
				sseClientId={sseClientId}
				runWithToast={runWithToast}
				orgShortId={organization.shortId}
			/>
			{matchedIntegrations.length > 0 && (
				<div className="p-1 flex flex-col gap-2 max-w-full">
					<Tile className="md:w-full items-start p-0 flex-col gap-1" variant={"transparent"}>
						<TileHeader>
							<TileTitle asChild>
								<InlineLabel
									icon={<IconPlug />}
									text="Integrations"
									className="text-xs text-muted-foreground [&_svg]:size-4 ps-6"
								/>
							</TileTitle>
						</TileHeader>
						<TileAction className="flex flex-col gap-1 items-start">
							{matchedIntegrations.map(({ config, activity }) => {
								const url = config.getUrl(activity.toValue?.data);
								if (url) {
									return (
										<a
											key={activity.id}
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											className={cn(
												"bg-transparent p-1 h-auto w-fit inline-flex items-center rounded-lg hover:bg-secondary border border-transparent hover:border-border group/link transition-all",
												config.className
											)}
										>
											<div className="flex items-center gap-2 text-xs">
												{config.icon}
												<span>{config.label}</span>
												<IconExternalLink className="size-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-all" />
											</div>
										</a>
									);
								}
								return (
									<div key={activity.id} className="flex items-center gap-2 text-xs p-1">
										{config.icon}
										<span>{config.label}</span>
									</div>
								);
							})}
						</TileAction>
					</Tile>
				</div>
			)}
		</div>
	);
}

export function TaskContentMobileContent({
	task,
	labels,
	tasks,
	setTasks,
	setSelectedTask,
	availableUsers = [],
	categories,
	releases,
}: Omit<TaskContentSideContentProps, "sseClientId" | "runWithToast">) {
	const { permissions } = useLayoutOrganization();
	const { account } = useLayoutData();
	const fieldPerms = getTaskFieldPermissions(task, account?.id, permissions);
	return (
		<div className="flex items-center justify-between gap-3">
			<div className="flex items-center gap-1 w-full overflow-x-auto py-1">
				<TaskFieldToolbar
					task={task}
					variant="compact"
					fieldPermissions={fieldPerms}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					categories={categories}
					releases={releases}
					availableLabels={labels}
					availableUsers={availableUsers}
					fields={[
						"status",
						"priority",
						{ key: "labels", compact: true },
						{ key: "assignees", compact: true },
						"category",
						"visibility",
						"release",
						"vote",
					]}
				/>
				<GlobalTaskGithubIssue task={task} className="shrink-0 bg-accent" />
			</div>
		</div>
	);
}

interface TaskContentMainProps {
	task: schema.TaskWithLabels;
	tasks: schema.TaskWithLabels[];
	setTasks: (tasks: schema.TaskWithLabels[]) => void;
	setTask: (task: schema.TaskWithLabels) => void;
	labels: schema.labelType[];
	availableUsers?: schema.userType[];
	organization: schema.OrganizationWithMembers;
	categories: schema.categoryType[];
	releases: schema.releaseType[];
}

export function TaskContentMain({
	task,
	tasks,
	setTasks,
	setTask,
	labels,
	availableUsers = [],
	organization,
	categories,
	releases = [],
}: TaskContentMainProps) {
	const { permissions } = useLayoutOrganization();
	const { account } = useLayoutData();
	const fieldPerms = getTaskFieldPermissions(task, account?.id, permissions);
	const isProjectAdmin = permissions?.admin?.administrator === true;

	// Wrapper function to match setSelectedTask signature
	const setSelectedTask = (t: schema.TaskWithLabels | null) => {
		if (t) setTask(t);
	};

	return (
		<div className="">
			<SubWrapper style="compact" className="max-w-6xl gap-6">
				{/* Editable Header with title and description */}
				<TaskEditableHeader
					task={task}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					categories={categories}
					organization={organization}
					canEdit={fieldPerms.category ?? true}
				/>
				<TaskContextBanner
					task={task}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					organization={organization}
				/>
				<AiInsights
					task={task}
					orgId={organization.id}
					availableLabels={labels}
					availableUsers={availableUsers}
					categories={categories}
					releases={releases}
					tasks={tasks}
					setTasks={setTasks}
					setSelectedTask={setSelectedTask}
					isProjectAdmin={isProjectAdmin}
				/>
				<GlobalTimeline
					task={task}
					labels={labels}
					availableUsers={availableUsers}
					categories={categories}
					tasks={tasks}
					releases={releases}
					organization={organization}
				/>
			</SubWrapper>
		</div>
	);
}
