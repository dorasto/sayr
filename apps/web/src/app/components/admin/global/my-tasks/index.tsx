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
	const { ws, organizations } = useLayoutData();
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
			const updatedTask = msg.data;
			const updatedTasks = tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
			setTasks(updatedTasks);
		},
		CREATE_TASK: (msg) => {
			// Check if this task is assigned to the current user
			// We'll need to refresh the list or check assignees
			setTasks([...tasks, msg.data]);
		},
		CREATE_LABEL: (msg) => {
			if (msg.scope === "INDIVIDUAL" && organizations.find((org) => org.id === msg.data.organizationId)) {
				setLabels([...labels, msg.data]);
			}
		},
		CREATE_VIEW: (msg) => {
			if (msg.scope === "INDIVIDUAL" && organizations.find((org) => org.id === msg.data.organizationId)) {
				setViews([...views, msg.data]);
			}
		},
		CREATE_CATEGORY: (msg) => {
			if (msg.scope === "INDIVIDUAL" && organizations.find((org) => org.id === msg.data.organizationId)) {
				setCategories([...categories, msg.data]);
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
