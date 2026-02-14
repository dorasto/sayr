import type { schema } from "@repo/database";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { cn } from "@repo/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useMyTasks } from "@/contexts/ContextMine";
import { MyTasksList } from "./task-list";
import { MyTaskDetail } from "./task-detail";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { IconUser } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLayoutData } from "@/components/generic/Context";
import { PageHeader } from "@/components/generic/PageHeader";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import {
	useWSMessageHandler,
	type WSMessageHandler,
} from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { sendWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";

export default function MyTasksPage() {
	const queryClient = useQueryClient();
	queryClient.removeQueries({ queryKey: ["organization"] });
	const { ws, account } = useLayoutData();
	const {
		tasks,
		setTasks,
		labels,
		setLabels,
		categories,
		setCategories,
		releases,
	} = useMyTasks();
	const [selectedTask, setSelectedTask] = useState<schema.TaskWithLabels | null>(null);
	useWebSocketSubscription({ ws });

	// Get unique organizations from tasks for filtering
	const organizations = useMemo(() => {
		return Array.from(
			new Map(
				tasks
					.filter((t) => t.organization)
					.map((t) => [t.organization!.id, t.organization!]),
			).values(),
		);
	}, [tasks]);

	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_TASK: (msg) => {
			const org = organizations.find((e) => e.id === msg.data.organizationId);

			const updatedTask: schema.TaskWithLabels = {
				...msg.data,
				...(org && {
					organization: {
						id: org.id,
						name: org.name,
						slug: org.slug,
						logo: org.logo,
					},
				}),
			};

			const isUserInList = updatedTask.assignees?.some((user) => user.id === account.id);

			const taskExists = tasks.some((task) => task.id === updatedTask.id);

			let newTasks: schema.TaskWithLabels[];

			if (isUserInList) {
				newTasks = taskExists
					? tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
					: [...tasks, updatedTask];
			} else {
				newTasks = tasks.filter((task) => task.id !== updatedTask.id);
				if (selectedTask?.id === updatedTask.id) setSelectedTask(null);
			}

			setTasks(newTasks);

			if (selectedTask?.id === updatedTask.id) {
				setSelectedTask(updatedTask);
			}
			sendWindowMessage(
				window,
				{
					type: "timeline-update",
					payload: updatedTask.id,
				},
				"*",
			);
		},
		CREATE_TASK: (msg) => {
			if (msg.data.assignees.find((e: { id: string }) => e.id === account.id)) {
				setTasks([...tasks, msg.data]);
			}
		},
		UPDATE_LABELS: (msg) => {
			if (msg.scope === "INDIVIDUAL") {
				const newLabels = msg.data;
				if (!Array.isArray(newLabels)) return;

				const orgId = msg.meta?.orgId || newLabels[0]?.organizationId;
				if (!orgId) return;

				const updatedList = labels.filter((label) => label.organizationId !== orgId);
				const newList = [...updatedList, ...newLabels];
				setLabels(newList);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "INDIVIDUAL") {
				const newCategories = msg.data;
				if (!Array.isArray(newCategories)) return;

				const orgId = msg.meta?.orgId || newCategories[0]?.organizationId;
				if (!orgId) return;

				const updatedList = categories.filter((cat) => cat.organizationId !== orgId);
				const newList = [...updatedList, ...newCategories];
				setCategories(newList);
			}
		},
		UPDATE_TASK_COMMENTS: async (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.data.id === selectedTask?.id) {
				sendWindowMessage(
					window,
					{
						type: "timeline-update-comment",
						payload: msg.data.id,
					},
					"*",
				);
			}
		},
		UPDATE_TASK_VOTE: async (msg) => {
			if (msg.scope === "INDIVIDUAL" && msg.meta?.orgId) {
				const { id, voteCount } = msg.data;
				const updatedTasks = tasks.map((task) =>
					task.id === id && task.organizationId === msg.meta?.orgId
						? {
								...task,
								voteCount,
							}
						: task,
				);
				setTasks(updatedTasks);
				if (selectedTask?.id === id) {
					setSelectedTask({
						...selectedTask,
						voteCount,
					});
				}
				sendWindowMessage(
					window,
					{
						type: "update-votes",
						payload: msg.meta?.orgId,
					},
					"*",
				);
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		// onUnhandled: (msg) => console.warn("[UNHANDLED MESSAGE MyTasksPage]", msg),
	});

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	const isMobile = useIsMobile();

	const leftPanelContent = (
		<div className="flex-1 overflow-hidden h-full min-h-0 flex flex-col">
			<MyTasksList
				tasks={tasks}
				setTasks={setTasks}
				selectedTask={selectedTask}
				setSelectedTask={setSelectedTask}
				organizations={organizations}
				labels={labels}
				categories={categories}
				releases={releases}
			/>
		</div>
	);

	return (
		<div className="relative flex flex-col h-full max-h-full overflow-hidden">
			<PageHeader>
				<PageHeader.Identity icon={<IconUser className="size-4" />} title="My Tasks" />
			</PageHeader>
			{isMobile ? (
				leftPanelContent
			) : (
				<ResizablePanelGroup direction="horizontal" className="h-full">
					{/* Left panel - Task list */}
					<ResizablePanel defaultSize={25} minSize={10} maxSize={30}>
						{leftPanelContent}
					</ResizablePanel>

					<ResizableHandle />

					{/* Right panel - Task detail */}
					<ResizablePanel defaultSize={75}>
						<div className={cn("flex-1 overflow-y-auto h-full flex flex-col relative")}>
							{selectedTask ? (
								<MyTaskDetail
									task={selectedTask}
									tasks={tasks}
									setTasks={setTasks}
									setSelectedTask={setSelectedTask}
									labels={labels}
									categories={categories}
									releases={releases}
								/>
							) : (
								<div className="flex items-center justify-center h-full text-muted-foreground" />
							)}
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			)}
		</div>
	);
}
