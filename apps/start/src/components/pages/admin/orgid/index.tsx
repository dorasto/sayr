"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Tile, TileDescription, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { IconCategory, IconPlug, IconProgress, IconTag, IconUsers } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
	TaskStatusChart,
	TaskPriorityBar,
	TaskAssigneeChart,
	TaskCategoryBar,
	TaskTimelineChart,
	TaskCycleTimeChart,
	TaskThroughputChart,
	TaskAgeChart,
	TaskLabelDistributionChart,
	TaskCreationVsCompletionChart,
} from "@/components/charts";
import { useLayoutData } from "@/components/generic/Context";
import { SubWrapper } from "@/components/generic/wrapper";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { Route as OrgRoute } from "@/routes/(admin)/$orgId";
import { Route as OrgIndexRoute } from "@/routes/(admin)/$orgId/index";
export default function OrganizationHomePage() {
	const { permissions } = OrgRoute.useRouteContext(); // 👈 from TanStack router context
	const { tasks } = OrgIndexRoute.useLoaderData();
	// console.log("🚀 ~ OrganizationHomePage ~ permissions:", permissions);
	const { ws } = useLayoutData();
	const { organization, setOrganization, setLabels, setViews, setCategories, categories } = useLayoutOrganization();

	// Filter to only show open tasks (not done or canceled)
	const openTasks = useMemo(
		() => tasks.filter((task) => task.status !== "done" && task.status !== "canceled"),
		[tasks]
	);

	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_LABELS: (msg) => {
			if (msg.scope === "CHANNEL") {
				setLabels(msg.data);
			}
		},
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "CHANNEL") {
				setViews(msg.data);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "CHANNEL") {
				setCategories(msg.data);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		// onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE ORG PAGE]", msg),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		// Cleanup on unmount or dependency change
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);
	// console.log("orghomepage organization:", organization);
	return (
		<SubWrapper
			title={`${organization.name}`}
			description={`${organization.slug}.sayr.io`}
			icon={
				<Avatar>
					<AvatarImage src={organization.logo || ""} alt={organization.name} />
					<AvatarFallback>{organization.name.charAt(0)}</AvatarFallback>
				</Avatar>
			}
			// style="compact"
			// className="max-w-4xl"
		>
			<div className="grid grid-cols-1 md:grid-cols-12 gap-3">
				<Link to={`/$orgId/tasks`} params={{ orgId: organization.id }} className="col-span-full w-full">
					<Tile className="md:w-full hover:bg-accent">
						<TileHeader className="w-full">
							<TileIcon className="h-full aspect-square flex items-center justify-center bg-transparent">
								<IconProgress className="size-10!" />
							</TileIcon>
							<TileTitle className="text-xl font-bold">Tasks</TileTitle>
							<TileDescription>Let's see what awaits</TileDescription>
						</TileHeader>
					</Tile>
				</Link>

				<Link
					to={`/settings/org/$orgId/categories`}
					params={{ orgId: organization.id }}
					className="md:col-span-6 col-span-full md:row-span-2"
				>
					<Tile className="md:w-full hover:bg-accent h-full">
						<TileHeader className="w-full">
							<TileIcon className="h-full aspect-square flex items-center justify-center bg-transparent">
								<IconCategory />
							</TileIcon>
							<TileTitle className="font-bold">Categories</TileTitle>
						</TileHeader>
					</Tile>
				</Link>
				<Link
					to={`/settings/org/$orgId/labels`}
					params={{ orgId: organization.id }}
					className="md:col-span-3 col-span-full"
				>
					<Tile className="md:w-full hover:bg-accent h-full">
						<TileHeader className="w-full">
							<TileIcon className="h-full aspect-square flex items-center justify-center bg-transparent">
								<IconTag />
							</TileIcon>
							<TileTitle className="font-bold">Labels</TileTitle>
						</TileHeader>
					</Tile>
				</Link>
				<Link
					to={`/settings/org/$orgId/members`}
					params={{ orgId: organization.id }}
					className="md:col-span-3 col-span-full"
				>
					<Tile className="md:w-full hover:bg-accent">
						<TileHeader className="w-full">
							<TileIcon className="h-full aspect-square flex items-center justify-center bg-transparent">
								<IconUsers />
							</TileIcon>
							<TileTitle className="font-bold">Team</TileTitle>
						</TileHeader>
					</Tile>
				</Link>
				<Link
					to={`/settings/org/$orgId/connections`}
					params={{ orgId: organization.id }}
					className="md:col-span-6 col-span-full"
				>
					<Tile className="md:w-full hover:bg-accent">
						<TileHeader className="w-full">
							<TileIcon className="h-full aspect-square flex items-center justify-center bg-transparent">
								<IconPlug />
							</TileIcon>
							<TileTitle className="font-bold">Connections</TileTitle>
						</TileHeader>
					</Tile>
				</Link>
			</div>
			{/* Dashboard Charts Section */}
			<div className="grid grid-cols-1 md:grid-cols-12 gap-3">
				<Tile className="md:w-full md:col-span-8 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Status Distribution Over Time</TileTitle>
						<TileDescription>
							How tasks are distributed across statuses (backlog, todo, in-progress)
						</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskTimelineChart tasks={tasks} days={14} />
					</div>
				</Tile>
				{/*<Tile className="md:w-full md:col-span-2 flex flex-col items-start gap-0">
          <TileHeader>
            <TileTitle>Status Distribution</TileTitle>
            <TileDescription>Open tasks by status</TileDescription>
          </TileHeader>
          <div className="h-full w-full">
            <TaskStatusChart
              tasks={openTasks}
              className="mx-auto"
              totalLabel="Open tasks"
            />
          </div>
        </Tile>*/}
				<Tile className="md:w-full md:col-span-4 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Priority</TileTitle>
						<TileDescription>Current priority distribution</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskPriorityBar tasks={openTasks} />
					</div>
				</Tile>
				<Tile className="md:w-full md:col-span-4 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Categories</TileTitle>
						<TileDescription>Open tasks by category</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskCategoryBar tasks={openTasks} categories={categories} />
					</div>
				</Tile>
				<Tile className="md:w-full md:col-span-4 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Assignee Workload</TileTitle>
						<TileDescription>Tasks assigned to each member</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskAssigneeChart tasks={openTasks} maxItems={6} />
					</div>
				</Tile>
				<Tile className="md:w-full md:col-span-4 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Label Distribution</TileTitle>
						<TileDescription>Open tasks by label</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskLabelDistributionChart tasks={openTasks} maxItems={6} />
					</div>
				</Tile>
				<Tile className="md:w-full md:col-span-3 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Throughput</TileTitle>
						<TileDescription>Tasks completed per week</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskThroughputChart tasks={tasks} weeks={8} />
					</div>
				</Tile>
				<Tile className="md:w-full md:col-span-3 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Creation vs Completion</TileTitle>
						<TileDescription>Tasks created vs completed per week</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskCreationVsCompletionChart tasks={tasks} weeks={8} />
					</div>
				</Tile>
				<Tile className="md:w-full md:col-span-3 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Task Age</TileTitle>
						<TileDescription>How long open tasks have been waiting</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskAgeChart tasks={openTasks} />
					</div>
				</Tile>
				<Tile className="md:w-full md:col-span-3 flex flex-col items-start gap-0">
					<TileHeader>
						<TileTitle>Cycle Time</TileTitle>
						<TileDescription>Average time to complete tasks</TileDescription>
					</TileHeader>
					<div className="h-full w-full">
						<TaskCycleTimeChart tasks={tasks} weeks={8} />
					</div>
				</Tile>
			</div>
		</SubWrapper>
		// <div className="">
		// 	<TabbedDialogExample />
		// 	<h1>org detail {organization.name}</h1>
		// 	{/** biome-ignore lint/performance/noImgElement: <will use> */}
		// 	<img src={organization.logo || ""} alt={organization.name} />
		// 	{/** biome-ignore lint/performance/noImgElement: <will use> */}
		// 	<img src={organization.bannerImg || ""} alt={organization.name} />
		// 	<h1 className="text-2xl font-bold">👋 Welcome, {account.name}</h1>
		// 	<div className="flex items-center gap-2">
		// 		<span className="font-medium">WebSocket Status:</span>
		// 		<span
		// 			className={`px-2 py-1 rounded text-sm ${
		// 				wsStatus === "Connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
		// 			}`}
		// 		>
		// 			{wsStatus}
		// 		</span>
		// 	</div>
		// 	{wsSubscribedState ? (
		// 		<div className="text-green-600 font-medium">
		// 			✅ Subscribed to channel <code>{wsSubscribedState.channel}</code>
		// 		</div>
		// 	) : (
		// 		<div className="text-yellow-600">⏳ Waiting for subscription...</div>
		// 	)}
		// </div>
	);
}
