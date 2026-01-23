"use client";

import { useLayoutData } from "@/components/generic/Context";
import CreateRelease from "@/components/organization/create-release";
import { UnifiedTaskView } from "@/components/tasks/views/unified-task-view";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import { getReleaseWithTasksAction } from "@/lib/fetches/release";
import type { WSMessage } from "@/lib/ws";
import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { IconCalendar, IconCheck, IconHash, IconRocket, IconTag } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatDate } from "@repo/util";

interface ReleaseDetailPageProps {
	release: schema.releaseType;
}

export default function ReleaseDetailPage({ release: initialRelease }: ReleaseDetailPageProps) {
	const { ws } = useLayoutData();
	const router = useRouter();
	const { organization, setOrganization, labels, categories, releases, setReleases } =
		useLayoutOrganization();

	const [release, setRelease] = useState<schema.ReleaseWithTasks | null>(null);
	const [tasks, setTasks] = useState<schema.TaskWithLabels[]>([]);
	const [loading, setLoading] = useState(true);

	const availableUsers = organization?.members.map((member) => member.user) || [];

	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});

	// Load release with tasks
	useEffect(() => {
		const loadRelease = async () => {
			try {
				setLoading(true);
				const result = await getReleaseWithTasksAction(organization.id, initialRelease.id);
				if (result.success && result.data) {
					setRelease(result.data);
					setTasks(result.data.tasks);
				}
			} catch (error) {
				console.error("Failed to load release:", error);
			} finally {
				setLoading(false);
			}
		};

		void loadRelease();
	}, [initialRelease.id, organization.id]);

	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_RELEASES: (msg) => {
			if (msg.scope === "CHANNEL" && "data" in msg) {
				setReleases(msg.data);
				// Update current release if it's in the updated list
				const updatedRelease = (msg.data as schema.releaseType[]).find(
					(r) => r.id === release?.id,
				);
				if (updatedRelease && release) {
					// Preserve tasks array and createdBy when updating release metadata
					setRelease({ 
						...release, 
						...updatedRelease, 
						tasks: release.tasks,
						createdBy: release.createdBy 
					} as schema.ReleaseWithTasks);
				}
			}
		},
		DELETE_RELEASE: (msg) => {
			if (msg.scope === "CHANNEL" && "data" in msg && msg.data?.releaseId) {
				setReleases(releases.filter((r: schema.releaseType) => r.id !== msg.data.releaseId));
				// If current release was deleted, redirect
				if (msg.data.releaseId === release?.id) {
					void router.navigate({ to: `/${organization.id}/settings/org/${organization.id}/releases` });
				}
			}
		},
		UPDATE_TASK: (msg) => {
			if (msg.scope === "CHANNEL" && "data" in msg) {
				const task = msg.data as schema.TaskWithLabels;
				// If task belongs to this release, update it
				if (task.releaseId === release?.id) {
					setTasks((prevTasks) => {
						const existingIndex = prevTasks.findIndex((t) => t.id === task.id);
						if (existingIndex >= 0) {
							const newTasks = [...prevTasks];
							newTasks[existingIndex] = task;
							return newTasks;
						}
						return [...prevTasks, task];
					});
				} else {
					// Task was removed from this release
					setTasks((prevTasks) => prevTasks.filter((t) => t.id !== task.id));
				}
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE ReleaseDetailPage]", msg),
	});

	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);

	if (loading || !release) {
		return (
			<div className="flex items-center justify-center h-full p-8">
				<div className="text-center">
					<p className="text-muted-foreground">Loading release details...</p>
				</div>
			</div>
		);
	}

	const statusColors: Record<schema.releaseType["status"], string> = {
		planned: "bg-blue-500/10 text-blue-500 border-blue-500/20",
		"in-progress": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
		released: "bg-green-500/10 text-green-500 border-green-500/20",
		archived: "bg-gray-500/10 text-gray-500 border-gray-500/20",
	};

	const taskStats = {
		total: tasks.length,
		done: tasks.filter((t) => t.status === "done").length,
		inProgress: tasks.filter((t) => t.status === "in-progress").length,
		todo: tasks.filter((t) => t.status === "todo").length,
		backlog: tasks.filter((t) => t.status === "backlog").length,
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="border-b bg-card">
				<div className="p-6 space-y-4">
					{/* Title Row */}
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-3 min-w-0">
							<div
								className="flex items-center justify-center w-10 h-10 rounded-lg"
								style={{ backgroundColor: release.color || "hsla(0, 0%, 50%, 0.1)" }}
							>
								{release.icon ? (
									<span className="text-lg">{release.icon}</span>
								) : (
									<IconRocket className="w-5 h-5" />
								)}
							</div>
							<div className="min-w-0">
								<h1 className="text-2xl font-semibold truncate">{release.name}</h1>
								<div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
									<IconHash className="w-4 h-4" />
									<span className="font-mono">{release.slug}</span>
								</div>
							</div>
						</div>
						<Badge className={cn("border", statusColors[release.status])}>
							{release.status === "in-progress" ? "In Progress" : release.status}
						</Badge>
					</div>

					{/* Metadata Row */}
					<div className="flex items-center gap-6 text-sm text-muted-foreground">
						{release.targetDate && (
							<div className="flex items-center gap-2">
								<IconCalendar className="w-4 h-4" />
								<span>Target: {formatDate(release.targetDate)}</span>
							</div>
						)}
						{release.releasedAt && (
							<div className="flex items-center gap-2">
								<IconCheck className="w-4 h-4" />
								<span>Released: {formatDate(release.releasedAt)}</span>
							</div>
						)}
						<div className="flex items-center gap-2">
							<IconTag className="w-4 h-4" />
							<span>
								{taskStats.total} {taskStats.total === 1 ? "task" : "tasks"}
							</span>
						</div>
					</div>

					{/* Task Stats */}
					{taskStats.total > 0 && (
						<div className="flex items-center gap-4 text-sm">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-green-500" />
								<span>Done: {taskStats.done}</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-yellow-500" />
								<span>In Progress: {taskStats.inProgress}</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-blue-500" />
								<span>To Do: {taskStats.todo}</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 rounded-full bg-gray-500" />
								<span>Backlog: {taskStats.backlog}</span>
							</div>
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center gap-2">
						<CreateRelease
							orgId={organization.id}
							setReleases={setReleases}
							release={release}
							mode="edit"
							taskCount={taskStats.total}
							settingsUI={false}
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								router.navigate({ to: `/${organization.id}/settings/org/${organization.id}/releases` })
							}
						>
							View All Releases
						</Button>
					</div>
				</div>
			</div>

			{/* Tasks */}
			<div className="flex-1 overflow-hidden">
				{tasks.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center p-8">
						<IconRocket className="w-12 h-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-medium mb-2">No tasks yet</h3>
						<p className="text-sm text-muted-foreground">
							Tasks assigned to this release will appear here.
						</p>
					</div>
				) : (
				<UnifiedTaskView
					tasks={tasks}
					setTasks={setTasks}
					ws={ws}
					labels={labels}
					availableUsers={availableUsers}
					organization={organization}
					categories={categories}
					releases={releases}
				/>
				)}
			</div>
		</div>
	);
}
