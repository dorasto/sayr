import type { schema } from "@repo/database";
import { useEffect, useMemo } from "react";
import { useMyTasks } from "@/contexts/ContextMine";
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
import { Separator } from "@repo/ui/components/separator";
import { TaskFilterDropdown } from "@/components/tasks/filter";
import { TaskViewDropdown, UnifiedTaskView } from "@/components/tasks/views";

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

	useWebSocketSubscription({ ws });

	// Get unique organizations from tasks for WS handlers
	const organizations = useMemo(() => {
		return Array.from(
			new Map(
				tasks
					.filter((t) => t.organization)
					.map((t) => [t.organization!.id, t.organization!]),
			).values(),
		);
	}, [tasks]);

	// Derive available users from task assignees (cross-org)
	// UserSummary is a subset of userType; cast is safe since UnifiedTaskItem
	// only uses id/name/image for display purposes
	const availableUsers = useMemo(() => {
		const userMap = new Map<string, schema.UserSummary>();
		for (const task of tasks) {
			if (task.assignees) {
				for (const user of task.assignees) {
					if (!userMap.has(user.id)) {
						userMap.set(user.id, user);
					}
				}
			}
		}
		return Array.from(userMap.values()) as unknown as schema.userType[];
	}, [tasks]);

	// --- WebSocket Handlers ---

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

			const isUserInList = updatedTask.assignees?.some(
				(user) => user.id === account.id,
			);

			const taskExists = tasks.some((task) => task.id === updatedTask.id);

			let newTasks: schema.TaskWithLabels[];

			if (isUserInList) {
				newTasks = taskExists
					? tasks.map((task) =>
							task.id === updatedTask.id ? updatedTask : task,
						)
					: [...tasks, updatedTask];
			} else {
				newTasks = tasks.filter((task) => task.id !== updatedTask.id);
			}

			setTasks(newTasks);
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
			if (
				msg.data.assignees.find(
					(e: { id: string }) => e.id === account.id,
				)
			) {
				setTasks([...tasks, msg.data]);
			}
		},
		UPDATE_LABELS: (msg) => {
			if (msg.scope === "INDIVIDUAL") {
				const newLabels = msg.data;
				if (!Array.isArray(newLabels)) return;

				const orgId =
					msg.meta?.orgId || newLabels[0]?.organizationId;
				if (!orgId) return;

				const updatedList = labels.filter(
					(label) => label.organizationId !== orgId,
				);
				const newList = [...updatedList, ...newLabels];
				setLabels(newList);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "INDIVIDUAL") {
				const newCategories = msg.data;
				if (!Array.isArray(newCategories)) return;

				const orgId =
					msg.meta?.orgId || newCategories[0]?.organizationId;
				if (!orgId) return;

				const updatedList = categories.filter(
					(cat) => cat.organizationId !== orgId,
				);
				const newList = [...updatedList, ...newCategories];
				setCategories(newList);
			}
		},
		UPDATE_TASK_COMMENTS: async (msg) => {
			if (msg.scope === "INDIVIDUAL") {
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
						? { ...task, voteCount }
						: task,
				);
				setTasks(updatedTasks);
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

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {});

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	return (
		<div className="relative flex flex-col h-full max-h-full overflow-hidden">
			<PageHeader>
				<PageHeader.Identity
					icon={<IconUser className="size-4" />}
					title="My Tasks"
				/>
				<PageHeader.Toolbar
					left={
						<TaskFilterDropdown
							tasks={tasks}
							labels={labels}
							availableUsers={availableUsers}
							categories={categories}
							releases={releases}
						/>
					}
					right={
						<>
							<Separator orientation="vertical" className="h-5" />
							<TaskViewDropdown />
						</>
					}
				/>
			</PageHeader>
			<UnifiedTaskView
				tasks={tasks}
				setTasks={setTasks}
				ws={ws}
				availableUsers={availableUsers}
				categories={categories}
				releases={releases}
				personal
			/>
		</div>
	);
}
