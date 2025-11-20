"use client";

import { Separator } from "@repo/ui/components/separator";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useLayoutData } from "@/app/admin/Context";
import { useMyTasks } from "@/app/admin/mine/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";
import { TaskFilterDropdown } from "../org/tasks/task/filter/dropdown/TaskFilterDropdown";
import { TaskViewDropdown } from "../org/tasks/task/grouping/task-view-dropdown";
import { MyTaskList } from "./my-task-list";

export default function MyTasksPage() {
	const queryClient = useQueryClient();
	queryClient.removeQueries({ queryKey: ["organization"] });
	const { ws, organizations, account } = useLayoutData();
	const { tasks, setTasks, labels, views, setViews, categories, setLabels, setCategories } = useMyTasks();
	useWebSocketSubscription({ ws });
	// Collect all users from all organizations
	const allUsers = useMemo(() => {
		const userMap = new Map();
		organizations.forEach((org) => {
			org.members?.forEach((member) => {
				if (!userMap.has(member.user.id)) {
					userMap.set(member.user.id, member.user);
				}
			});
		});
		return Array.from(userMap.values());
	}, [organizations]);

	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_TASK: (msg) => {
			// default values to add if missing
			const defaults = {
				organization: {
					id: msg.data.organizationId,
					name: organizations.find((e) => e.id === msg.data.organizationId)?.name,
					slug: organizations.find((e) => e.id === msg.data.organizationId)?.slug,
				},
			};
			// combine defaults with msg.data — properties in msg.data override defaults
			const updatedTask = { ...defaults, ...msg.data };
			const isUserInList = updatedTask.assignees?.some((user) => user.id === account.id);
			let newTasks = [...tasks]; // use current tasks from closure
			const taskExists = newTasks.some((task) => task.id === updatedTask.id);
			if (isUserInList) {
				newTasks = taskExists
					? newTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
					: // biome-ignore lint/suspicious/noExplicitAny: <any>
						([...newTasks, updatedTask] as any);
			} else {
				newTasks = newTasks.filter((task) => task.id !== updatedTask.id);
			}
			setTasks(newTasks);
		},
		CREATE_TASK: (msg) => {
			if (msg.data.assignees.find((e) => e.id === account.id)) {
				setTasks([...tasks, msg.data]);
			}
		},
		UPDATE_LABELS: (msg) => {
			if (msg.scope === "INDIVIDUAL") {
				const newLabels = msg.data;
				if (!Array.isArray(newLabels)) return;

				// Try to get orgId from meta first, fallback to first category item
				const orgId = msg.meta?.orgId || newLabels[0]?.organizationId;
				if (!orgId) return; // nothing to update if we can't determine org

				// remove existing categories for this org
				const updatedList = labels.filter((label) => label.organizationId !== orgId);

				// add the new ones for this org
				const newList = [...updatedList, ...newLabels];

				setLabels(newList);
			}
		},
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "INDIVIDUAL") {
				const newViews = msg.data;
				if (!Array.isArray(newViews)) return;

				// Try to get orgId from meta first, fallback to first category item
				const orgId = msg.meta?.orgId || newViews[0]?.organizationId;
				if (!orgId) return; // nothing to update if we can't determine org

				// remove existing categories for this org
				const updatedList = views.filter((view) => view.organizationId !== orgId);

				// add the new ones for this org
				const newList = [...updatedList, ...newViews];

				setViews(newList);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "INDIVIDUAL") {
				const newCategories = msg.data;
				if (!Array.isArray(newCategories)) return;

				// Try to get orgId from meta first, fallback to first category item
				const orgId = msg.meta?.orgId || newCategories[0]?.organizationId;
				if (!orgId) return; // nothing to update if we can't determine org

				// remove existing categories for this org
				const updatedList = categories.filter((cat) => cat.organizationId !== orgId);

				// add the new ones for this org
				const newList = [...updatedList, ...newCategories];

				setCategories(newList);
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE MY TASKS]", msg),
	});

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	return (
		<div className="relative flex flex-col h-full max-h-full">
			<div className="sticky top-0 z-20 bg-background flex items-center gap-2 p-2">
				<TaskFilterDropdown
					tasks={tasks}
					labels={labels}
					availableUsers={allUsers}
					views={views}
					setViews={setViews}
					organizationId={""}
					categories={categories}
				/>
				<div className="flex items-center gap-2 shrink-0 ml-auto">
					<Separator orientation="vertical" className="h-5" />
					<TaskViewDropdown />
				</div>
			</div>
			<div className="flex-1 overflow-scroll flex flex-col relative">
				<MyTaskList
					tasks={tasks}
					setTasks={setTasks}
					ws={ws}
					labels={labels}
					availableUsers={allUsers}
					organizations={organizations}
					categories={categories}
				/>
			</div>
		</div>
	);
}
