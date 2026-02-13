import { Octokit } from "@octokit/rest";
import {
	addLabelToTask,
	addLogEventTask,
	createComment,
	createOrToggleCommentReaction,
	createOrToggleTaskVote,
	createTask,
	db,
	getOrganizationMembers,
	getTaskById,
	getTaskByShortId,
	getTaskTimeline,
	removeLabelFromTask,
	schema,
	userSummaryColumns,
} from "@repo/database";
import { getInstallationToken } from "@repo/util/github/auth";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import type { WSBaseMessage } from "@/routes/ws/types";
// import { enqueueJob } from "@/queue";
import {
	broadcast,
	broadcastIndividual,
	broadcastPublic,
	broadcastToRoom,
	findClientByWsId,
	findClientsByUserId,
} from "../../../ws";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { getAnonHash, getClientIP, traceOrgPermissionCheck } from "@/util";
import { errorResponse, paginatedSuccessResponse } from "../../../../responses";

export const apiRouteAdminProjectTask = new Hono<AppEnv>();

// Create a new task
apiRouteAdminProjectTask.post("/create", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		wsClientId,
		title,
		description,
		status,
		priority,
		labels,
		assignees,
		category,
		releaseId,
		visible,
	} = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "tasks.create");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to create tasks." }, 401);
	}

	const task = await traceAsync(
		"task.create.insert",
		() => createTask(orgId, { title, description, status, priority, category, releaseId, visible }, session?.userId),
		{
			description: "Creating task record",
			data: { orgId, title, status, priority, category, releaseId, visible },
		}
	);

	if (!task) {
		await recordWideError({
			name: "task.create.failed",
			error: new Error("Task creation failed"),
			code: "TASK_CREATION_FAILED",
			message: "Failed to create task in database",
			contextData: { orgId, title },
		});
		return c.json({ success: false, path: c.req.path, error: "Failed to create task" }, 500);
	}

	await traceAsync(
		"task.create.relations",
		async () => {
			if (labels?.length > 0) {
				for (const labelId of labels) {
					await addLabelToTask(orgId, task.id, labelId);
				}
			}

			if (assignees?.length > 0) {
				for (const userId of assignees) {
					await db
						.insert(schema.taskAssignee)
						.values({ taskId: task.id, organizationId: orgId, userId })
						.onConflictDoNothing();
				}
			}

			await addLogEventTask(
				task.id,
				orgId,
				"created",
				null,
				{ status, priority, title, labels, assignees },
				session?.userId,
				description
			);
		},
		{
			description: "Adding labels, assignees, and log event",
			data: {
				taskId: task.id,
				labelCount: labels?.length ?? 0,
				assigneeCount: assignees?.length ?? 0,
			},
		}
	);

	const taskWithData = await traceAsync("task.create.refetch", () => getTaskById(orgId, task.id), {
		description: "Fetching created task with relations",
	});

	await traceAsync(
		"task.create.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "CREATE_TASK" as WSBaseMessage["type"],
				data: taskWithData,
			};

			broadcast(orgId, `tasks`, data, found?.socket);
			if (taskWithData?.visible === "public") {
				broadcastPublic(orgId, { ...data, data: data }, found?.socket);
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.channel !== "tasks" &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting new task to clients" }
	);

	await traceAsync(
		"task.create.github_sync",
		async () => {
			const foundLink = await db.query.githubRepository.findFirst({
				where: and(
					eq(schema.githubRepository.organizationId, orgId),
					eq(schema.githubRepository.categoryId, category)
				),
			});

			if (!foundLink || !taskWithData) return;
			const org = await db.query.organization.findFirst({
				where: eq(schema.organization.id, orgId),
			});
			if (!org || !taskWithData) return;
			const sayrTaskUrl = `https://${org.slug}.sayr.io/${taskWithData.shortId}`;
			const token = await getInstallationToken(foundLink.installationId);
			const octokit = new Octokit({ auth: token });

			const { data: repoInfo } = await octokit.request("GET /repositories/{repository_id}", {
				repository_id: foundLink.repoId,
			});

			const owner = repoInfo.owner.login;
			const repo = repoInfo.name;

			const body =
				`↪ From Sayr task ${sayrTaskUrl}\n\n` +
				`<!-- sayr-task:${taskWithData.id} -->\n\n` +
				`---\n\n`;
			const { data: issue } = await octokit.request(
				"POST /repos/{owner}/{repo}/issues",
				{
					owner,
					repo,
					title,
					body,
				}
			);

			await db.insert(schema.githubIssue).values({
				repositoryId: foundLink.id,
				issueNumber: issue.number,
				issueUrl: issue.html_url,
				taskId: taskWithData.id,
				organizationId: orgId,
			});
		},
		{
			description: "Syncing task to GitHub (if linked)",
			data: { orgId, category, taskId: task.id },
			onSuccess: () => ({
				description: "GitHub sync completed",
				data: {},
			}),
		}
	);

	return c.json({ success: true, data: taskWithData });
});

// Update task details
apiRouteAdminProjectTask.patch("/update", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, wsClientId, task_id: taskId, ...updates } = await c.req.json();
	const session = c.get("session");
	const user = c.get("user");
	const isSystemAccount = user?.role === "system";

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to update tasks." }, 401);
	}

	const existingTask = await traceAsync(
		"task.update.lookup",
		() =>
			db.query.task.findFirst({
				where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
			}),
		{ description: "Finding task to update", data: { orgId, taskId } }
	);

	if (!existingTask) {
		await recordWideError({
			name: "task.update.notfound",
			error: new Error("Task not found"),
			code: "TASK_NOT_FOUND",
			message: "Task not found in database",
			contextData: { orgId, taskId },
		});
		return c.json({ success: false, error: "Task not found" }, 404);
	}

	const allowed: Partial<schema.taskType> = {};
	["title", "description", "status", "priority", "category", "releaseId", "visible"].forEach((field) => {
		if (updates[field] !== undefined) {
			// @ts-expect-error dynamic field
			allowed[field] = updates[field];
		}
	});

	await traceAsync(
		"task.update.save",
		async () => {
			if (Object.keys(allowed).length > 0) {
				await db
					.update(schema.task)
					.set({ ...allowed, updatedAt: new Date() })
					.where(and(eq(schema.task.id, taskId), eq(schema.task.organizationId, orgId)))
					.returning();
			}

			if (updates.category && updates.category !== existingTask.category) {
				await addLogEventTask(
					taskId,
					orgId,
					"category_change",
					existingTask.category,
					updates.category,
					session?.userId
				);
			}
			if (updates.status && updates.status !== existingTask.status) {
				await addLogEventTask(taskId, orgId, "status_change", existingTask.status, updates.status, session?.userId);
			}
			if (updates.priority && updates.priority !== existingTask.priority) {
				await addLogEventTask(
					taskId,
					orgId,
					"priority_change",
					existingTask.priority,
					updates.priority,
					session?.userId
				);
			}
			if (updates.title && updates.title !== existingTask.title) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "title", value: existingTask.title },
					{ field: "title", value: updates.title },
					session?.userId
				);
			}
			if (updates.description && JSON.stringify(updates.description) !== JSON.stringify(existingTask.description)) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "description", value: existingTask.description },
					{ field: "description", value: updates.description },
					session?.userId,
					updates.description
				);
			}
			if (updates.releaseId !== undefined && updates.releaseId !== existingTask.releaseId) {
				await addLogEventTask(
					taskId,
					orgId,
					"release_change",
					existingTask.releaseId,
					updates.releaseId,
					session?.userId
				);
			}
			if (updates.visible !== undefined && updates.visible !== existingTask.visible) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "visible", value: existingTask.visible },
					{ field: "visible", value: updates.visible },
					session?.userId
				);
			}
		},
		{
			description: "Updating task and logging changes",
			data: { orgId, taskId, fields: Object.keys(allowed), isSystemAccount },
			onSuccess: () => ({
				description: "Task updated successfully",
				data: { updates: allowed },
			}),
		}
	);

	const taskWithData = await traceAsync("task.update.refetch", () => getTaskById(orgId, taskId), {
		description: "Refetching updated task data",
	});

	await traceAsync(
		"task.update.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK" as WSBaseMessage["type"],
				data: taskWithData,
			};

			broadcastToRoom(orgId, `tasks;task:${taskId}`, data, found?.socket, true);
			if (taskWithData?.visible === "public") {
				broadcastPublic(orgId, { ...data }, found?.socket);
			}

			// If releaseId changed, broadcast release update as well
			if (updates.releaseId !== undefined && updates.releaseId !== existingTask.releaseId) {
				const releaseData = {
					type: "UPDATE_RELEASES" as WSBaseMessage["type"],
					data: { taskId, releaseId: updates.releaseId },
				};
				broadcast(orgId, "releases", releaseData, found?.socket);
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting task update to clients" }
	);

	return c.json({ success: true, data: taskWithData });
});

// --- GitHub Link Task ---
apiRouteAdminProjectTask.post("/github-link", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		task_id: taskId,
		repo_id: repoId,
		issue_number: issueNumber,
		issue_url: issueUrl,
	} = await c.req.json();

	const session = c.get("session");
	const user = c.get("user");
	const isSystemAccount = user?.role === "system";

	if (!isSystemAccount) {
		await recordWideError({
			name: "task.github_link.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to link GitHub issues",
			contextData: { orgId, userId: session?.userId },
		});
		return c.json(
			{
				success: false,
				error: "You don't have permission to link GitHub issues.",
			},
			401
		);
	}

	const existingTask = await traceAsync(
		"task.github_link.task_lookup",
		() =>
			db.query.task.findFirst({
				where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
			}),
		{ description: "Finding task to link", data: { orgId, taskId } }
	);

	if (!existingTask) {
		await recordWideError({
			name: "task.github_link.notfound",
			error: new Error("Task not found"),
			code: "TASK_NOT_FOUND",
			message: "Task not found in organization",
			contextData: { orgId, taskId },
		});
		return c.json({ success: false, error: "Task not found" }, 404);
	}

	const repo = await traceAsync(
		"task.github_link.repo_lookup",
		() =>
			db.query.githubRepository.findFirst({
				where: (r) => and(eq(r.organizationId, orgId), eq(r.repoId, repoId)),
			}),
		{ description: "Finding repository", data: { orgId, repoId } }
	);

	if (!repo) {
		await recordWideError({
			name: "task.github_link.repo_notfound",
			error: new Error("Repository not found"),
			code: "REPOSITORY_NOT_FOUND",
			message: "Repository not found in organization",
			contextData: { orgId, repoId },
		});
		return c.json({ success: false, error: "Repository not found" }, 404);
	}

	const existingLink = await traceAsync(
		"task.github_link.existing_check",
		() =>
			db.query.githubIssue.findFirst({
				where: (gi) => and(eq(gi.organizationId, orgId), eq(gi.taskId, taskId)),
			}),
		{ description: "Checking for existing link", data: { orgId, taskId } }
	);

	if (existingLink) {
		await recordWideError({
			name: "task.github_link.duplicate",
			error: new Error("Task already linked"),
			code: "DUPLICATE_LINK",
			message: `Task already linked to GitHub issue #${existingLink.issueNumber}`,
			contextData: {
				orgId,
				taskId,
				existingIssueNumber: existingLink.issueNumber,
			},
		});
		return c.json({
			success: false,
			error: `Task already linked to GitHub issue #${existingLink.issueNumber}`,
		});
	}

	const newLink = await traceAsync(
		"task.github_link.insert",
		async () => {
			const [link] = await db
				.insert(schema.githubIssue)
				.values({
					repositoryId: repo.id,
					organizationId: orgId,
					issueNumber,
					issueUrl,
					taskId,
				})
				.returning();
			return link;
		},
		{
			description: "Creating GitHub issue link",
			data: { orgId, taskId, repoId: repo.id, issueNumber },
			onSuccess: () => ({
				description: "GitHub issue linked successfully",
				data: { issueUrl },
			}),
		}
	);

	await traceAsync(
		"task.github_link.broadcast",
		async () => {
			const taskWithData = await getTaskById(orgId, taskId);
			const data = {
				type: "UPDATE_TASK" as WSBaseMessage["type"],
				data: taskWithData,
			};

			broadcastToRoom(orgId, `tasks;task:${taskId}`, data, undefined, true);
			if (taskWithData?.visible === "public") {
				broadcastPublic(orgId, { ...data });
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting GitHub link update to clients" }
	);

	return c.json({ success: true, data: newLink });
});

apiRouteAdminProjectTask.post("/activity", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		task_id: taskId,
		type,
		data, // ✅ this becomes fromValue
	} = await c.req.json();

	const session = c.get("session");
	const user = c.get("user");
	const isSystemAccount = user?.role === "system";

	// --------------------
	// Auth (system only)
	// --------------------
	if (!isSystemAccount) {
		await recordWideError({
			name: "task.activity.auth",
			error: new Error("Unauthorized"),
			code: "UNAUTHORIZED",
			message: "User does not have permission to create task activity",
			contextData: { orgId, userId: session?.userId },
		});

		return c.json(
			{
				success: false,
				error: "You don't have permission to create task activity.",
			},
			401
		);
	}

	// --------------------
	// Task lookup
	// --------------------
	const task = await traceAsync(
		"task.activity.task_lookup",
		() =>
			db.query.task.findFirst({
				where: (t) =>
					and(eq(t.id, taskId), eq(t.organizationId, orgId)),
			}),
		{
			description: "Finding task for activity",
			data: { orgId, taskId },
		}
	);

	if (!task) {
		await recordWideError({
			name: "task.activity.notfound",
			error: new Error("Task not found"),
			code: "TASK_NOT_FOUND",
			message: "Task not found in organization",
			contextData: { orgId, taskId },
		});

		return c.json({ success: false, error: "Task not found" }, 404);
	}

	// --------------------
	// Insert timeline event (✅ canonical path)
	// --------------------
	const activity = await traceAsync(
		"task.activity.insert",
		() =>
			addLogEventTask(
				taskId,
				orgId,
				type,
				null,
				data ?? null, // ✅ commit metadata lives here
				undefined
			),
		{
			description: "Creating task timeline activity",
			data: { orgId, taskId, type },
		}
	);

	// --------------------
	// Broadcast updates
	// --------------------
	await traceAsync(
		"task.activity.broadcast",
		async () => {
			const taskWithData = await getTaskById(orgId, taskId);

			const message = {
				type: "UPDATE_TASK" as WSBaseMessage["type"],
				data: taskWithData,
			};

			broadcastToRoom(
				orgId,
				`tasks;task:${taskId}`,
				message,
				undefined,
				true
			);

			if (taskWithData?.visible === "public") {
				broadcastPublic(orgId, { ...message });
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						!(
							client.channel === `task:${taskId}` ||
							client.channel === "tasks"
						) &&
						broadcastIndividual(
							client.socket,
							message,
							orgId
						)
				);
			});
		},
		{ description: "Broadcasting task activity to clients" }
	);

	return c.json({ success: true, data: activity });
});

// Update task labels
apiRouteAdminProjectTask.post("/update-labels", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, wsClientId, task_id: taskId, labels } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to update labels." }, 401);
	}

	try {
		const existingTask = await traceAsync(
			"task.labels.update.lookup",
			() =>
				db.query.task.findFirst({
					where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
					with: { labels: { with: { label: true } } },
				}),
			{
				description: "Finding task with current labels",
				data: { orgId, taskId },
			}
		);

		if (!existingTask) {
			await recordWideError({
				name: "task.labels.update.notfound",
				error: new Error("Task not found"),
				code: "TASK_NOT_FOUND",
				message: "Task not found in database",
				contextData: { orgId, taskId },
			});
			return c.json({ success: false, error: "Task not found" }, 404);
		}

		const currentLabelIds = existingTask.labels.map((l) => l.label.id);
		const incomingLabelIds: string[] = labels ?? [];

		await traceAsync(
			"task.labels.update.sync",
			async () => {
				for (const labelId of incomingLabelIds) {
					if (!currentLabelIds.includes(labelId)) {
						await addLabelToTask(orgId, taskId, labelId);
						await addLogEventTask(taskId, orgId, "label_added", null, labelId, session?.userId);
					}
				}

				for (const labelId of currentLabelIds) {
					if (!incomingLabelIds.includes(labelId)) {
						await removeLabelFromTask(orgId, taskId, labelId);
						await addLogEventTask(taskId, orgId, "label_removed", null, labelId, session?.userId);
					}
				}
			},
			{
				description: "Syncing task labels",
				data: {
					orgId,
					taskId,
					currentCount: currentLabelIds.length,
					incomingCount: incomingLabelIds.length,
				},
				onSuccess: () => ({
					description: "Task labels synced successfully",
					data: {
						added: incomingLabelIds.filter((id) => !currentLabelIds.includes(id)),
						removed: currentLabelIds.filter((id) => !incomingLabelIds.includes(id)),
					},
				}),
			}
		);

		const taskWithData = await traceAsync("task.labels.update.refetch", () => getTaskById(orgId, taskId), {
			description: "Refetching updated task data",
		});

		await traceAsync(
			"task.labels.update.broadcast",
			async () => {
				const found = findClientByWsId(wsClientId);
				const data = {
					type: "UPDATE_TASK" as WSBaseMessage["type"],
					data: taskWithData,
				};

				broadcastToRoom(orgId, `tasks;task:${taskId}`, data, found?.socket, true);
				if (taskWithData?.visible === "public") {
					broadcastPublic(orgId, { ...data }, found?.socket);
				}

				const members = await getOrganizationMembers(orgId);
				members.forEach((member) => {
					const clients = findClientsByUserId(member.userId);
					clients.forEach(
						(client) =>
							client.wsClientId !== wsClientId &&
							!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
							broadcastIndividual(client.socket, data, orgId)
					);
				});
			},
			{ description: "Broadcasting label update to clients" }
		);

		return c.json({ success: true, data: taskWithData });
	} catch (err) {
		await recordWideError({
			name: "task.labels.update.error",
			error: err,
			message: "Failed to update task labels",
			contextData: { orgId, taskId, labels },
		});
		const errorMessage =
			typeof err === "object" && err !== null && "message" in err
				? String((err as { message?: unknown }).message)
				: String(err);
		return c.json({ success: false, error: errorMessage }, 500);
	}
});
// Update task assignees
apiRouteAdminProjectTask.post("/update-assignees", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, wsClientId, task_id: taskId, assignees } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "tasks.assign");

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to update assignees.",
			},
			401
		);
	}

	try {
		const existingTask = await traceAsync(
			"task.assignees.update.lookup",
			() =>
				db.query.task.findFirst({
					where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
					with: {
						assignees: {
							with: {
								user: { columns: userSummaryColumns },
							},
						},
					},
				}),
			{
				description: "Finding task with current assignees",
				data: { orgId, taskId },
			}
		);

		if (!existingTask) {
			await recordWideError({
				name: "task.assignees.update.notfound",
				error: new Error("Task not found"),
				code: "TASK_NOT_FOUND",
				message: "Task not found in database",
				contextData: { orgId, taskId },
			});
			return c.json({ success: false, error: "Task not found" }, 404);
		}

		const currentAssigneeIds = existingTask.assignees.map((a) => a.user.id);
		const incomingAssigneeIds: string[] = assignees ?? [];

		await traceAsync(
			"task.assignees.update.sync",
			async () => {
				for (const userId of incomingAssigneeIds) {
					if (!currentAssigneeIds.includes(userId)) {
						await db
							.insert(schema.taskAssignee)
							.values({ taskId, organizationId: orgId, userId })
							.onConflictDoNothing();
						await addLogEventTask(taskId, orgId, "assignee_added", null, userId, session?.userId);
					}
				}

				for (const userId of currentAssigneeIds) {
					if (!incomingAssigneeIds.includes(userId)) {
						await db
							.delete(schema.taskAssignee)
							.where(
								and(
									eq(schema.taskAssignee.taskId, taskId),
									eq(schema.taskAssignee.organizationId, orgId),
									eq(schema.taskAssignee.userId, userId)
								)
							);
						await addLogEventTask(taskId, orgId, "assignee_removed", null, userId, session?.userId);
					}
				}
			},
			{
				description: "Syncing task assignees",
				data: {
					orgId,
					taskId,
					currentCount: currentAssigneeIds.length,
					incomingCount: incomingAssigneeIds.length,
				},
				onSuccess: () => ({
					description: "Task assignees synced successfully",
					data: {
						added: incomingAssigneeIds.filter((id) => !currentAssigneeIds.includes(id)),
						removed: currentAssigneeIds.filter((id) => !incomingAssigneeIds.includes(id)),
					},
				}),
			}
		);

		const taskWithData = await traceAsync("task.assignees.update.refetch", () => getTaskById(orgId, taskId), {
			description: "Refetching updated task data",
		});

		await traceAsync(
			"task.assignees.update.broadcast",
			async () => {
				const found = findClientByWsId(wsClientId);
				const data = {
					type: "UPDATE_TASK" as WSBaseMessage["type"],
					data: taskWithData,
				};

				broadcastToRoom(orgId, `tasks;task:${taskId}`, data, found?.socket, true);
				if (taskWithData?.visible === "public") {
					broadcastPublic(orgId, { ...data }, found?.socket);
				}

				const members = await getOrganizationMembers(orgId);
				members.forEach((member) => {
					const clients = findClientsByUserId(member.userId);
					clients.forEach(
						(client) =>
							client.wsClientId !== wsClientId &&
							!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
							broadcastIndividual(client.socket, data, orgId)
					);
				});
			},
			{ description: "Broadcasting assignee update to clients" }
		);

		return c.json({ success: true, data: taskWithData });
	} catch (err) {
		await recordWideError({
			name: "task.assignees.update.error",
			error: err,
			message: "Failed to update task assignees",
			contextData: { orgId, taskId, assignees },
		});
		const errorMessage =
			typeof err === "object" && err !== null && "message" in err
				? String((err as { message?: unknown }).message)
				: String(err);
		return c.json({ success: false, error: errorMessage }, 500);
	}
});

// Create a comment on a task
apiRouteAdminProjectTask.post("/create-comment", async (c) => {
	const traceAsync = createTraceAsync();

	const { org_id: orgId, wsClientId, task_id: taskId, content, visibility, source, externalAuthorLogin, externalAuthorUrl, externalIssueNumber, externalCommentId, externalCommentUrl, createdBy: bodyCreatedBy } = await c.req.json();
	const session = c.get("session");

	const isOrgMember = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");

	// Allow non-members to post public-only comments on public tasks
	if (!isOrgMember) {
		if (!session?.userId) {
			return c.json(
				{
					success: false,
					error: "You must be signed in to comment.",
				},
				401
			);
		}

		if (visibility !== "public") {
			return c.json(
				{
					success: false,
					error: "You can only post public comments.",
				},
				403
			);
		}

		// Verify the task exists and is publicly visible
		const task = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId), eq(t.visible, "public")),
			columns: { id: true },
		});

		if (!task) {
			return c.json(
				{
					success: false,
					error: "Task not found or is not public.",
				},
				404
			);
		}
	}

	await traceAsync(
		"task.comment.create.insert",
		() => {
			// For GitHub-sourced comments, only set createdBy if explicitly provided (linked Sayr user).
			// Otherwise leave it null so unlinked GitHub users show their GitHub identity, not the system account.
			const effectiveCreatedBy = source === "github" ? bodyCreatedBy : (bodyCreatedBy ?? session?.userId);
			return createComment(orgId, taskId, content, visibility, effectiveCreatedBy, source, externalAuthorLogin, externalAuthorUrl, externalIssueNumber, externalCommentId, externalCommentUrl);
		},
		{
			description: "Creating task comment",
			data: { orgId, taskId, visibility, userId: session?.userId },
			onSuccess: () => ({
				description: "Task comment created successfully",
				data: {},
			}),
		}
	);

	await traceAsync(
		"task.comment.create.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"],
				data: { id: taskId },
			};

			broadcastToRoom(orgId, `task:${taskId}`, data, found?.socket, false);
			if (visibility === "public") {
				broadcastPublic(orgId, { ...data }, found?.socket);
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting new comment to clients" }
	);

	return c.json({ success: true, data: { id: taskId } });
});

// Edit a comment on a task
apiRouteAdminProjectTask.put("/edit-comment", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, wsClientId, comment_id: commentId, content, visibility } = await c.req.json();
	const session = c.get("session");

	const isOrgMember = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");

	const comment = await traceAsync(
		"task.comment.edit.lookup",
		() => db.query.taskComment.findFirst({ where: (t) => eq(t.id, commentId) }),
		{ description: "Finding comment to edit", data: { commentId } }
	);

	if (!comment) {
		await recordWideError({
			name: "task.comment.edit.notfound",
			error: new Error("Comment not found"),
			code: "COMMENT_NOT_FOUND",
			message: "Comment not found in database",
			contextData: { orgId, commentId },
		});
		return c.json({ success: false, error: "COMMENT_NOT_FOUND" }, 404);
	}

	// Non-members can only edit their own public comments on public tasks
	if (!isOrgMember) {
		if (!session?.userId) {
			return c.json({ success: false, error: "You must be signed in to edit comments." }, 401);
		}

		if (comment.createdBy !== session.userId) {
			return c.json({ success: false, error: "You can only edit your own comments." }, 403);
		}

		// Verify the task is public
		const task = comment.taskId
			? await db.query.task.findFirst({
				where: (t) => and(eq(t.id, comment.taskId!), eq(t.organizationId, orgId), eq(t.visible, "public")),
				columns: { id: true },
			})
			: null;

		if (!task) {
			return c.json({ success: false, error: "Task not found or is not public." }, 404);
		}
	}

	await traceAsync(
		"task.comment.edit.transaction",
		() =>
			db.transaction(async (tx) => {
				// First, save the OLD content to history before overwriting
				await tx.insert(schema.taskCommentHistory).values({
					organizationId: comment.organizationId,
					taskId: comment.taskId,
					commentId: comment.id,
					editedBy: session?.userId,
					content: comment.content, // Save the OLD content, not the new one
				});

				// Then update the comment with the new content
				await tx
					.update(schema.taskComment)
					.set({
						content,
						visibility: visibility ?? comment.visibility,
						updatedAt: new Date(),
					})
					.where(eq(schema.taskComment.id, commentId));
			}),
		{
			description: "Updating comment and inserting history",
			data: {
				orgId,
				commentId,
				taskId: comment.taskId,
				userId: session?.userId,
			},
			onSuccess: () => ({
				description: "Task comment edited successfully",
				data: { visibility: visibility ?? comment.visibility },
			}),
		}
	);

	await traceAsync(
		"task.comment.edit.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"],
				data: { id: comment.taskId },
			};

			broadcastToRoom(orgId, `task:${comment.taskId}`, data, found?.socket, false);
			broadcastPublic(orgId, { ...data }, found?.socket);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${comment.taskId}` || client.channel === "tasks") &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting comment update to clients" }
	);

	return c.json({ success: true, data: { id: comment.taskId } });
});

// Delete a comment
apiRouteAdminProjectTask.delete("/delete-comment", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, task_id: taskId, comment_id: commentId, wsClientId } = await c.req.json();
	const session = c.get("session");

	// Check if user is a member of the organization
	const isMember = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");

	// Fetch the comment
	const comment = await traceAsync(
		"task.comment.delete.lookup",
		() => db.query.taskComment.findFirst({ where: (t) => eq(t.id, commentId) }),
		{ description: "Finding comment to delete", data: { commentId } }
	);

	if (!comment) {
		await recordWideError({
			name: "task.comment.delete.notfound",
			error: new Error("Comment not found"),
			code: "COMMENT_NOT_FOUND",
			message: "Comment not found in database",
			contextData: { orgId, commentId },
		});
		return c.json({ success: false, error: "COMMENT_NOT_FOUND" }, 404);
	}

	const isAuthor = comment.createdBy === session?.userId;

	if (isMember) {
		// Org members: author, admin, or mod can delete
		const hasAdminPermission = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.administrator");
		const hasModPermission = await traceOrgPermissionCheck(
			session?.userId || "",
			orgId,
			"moderation.manageComments",
		);

		if (!isAuthor && !hasAdminPermission && !hasModPermission) {
			return c.json(
				{ success: false, error: "You don't have permission to delete this comment." },
				403,
			);
		}
	} else {
		// Non-members: must be signed in and can only delete their own comments on public tasks
		if (!session?.userId) {
			return c.json({ success: false, error: "You must be signed in to delete comments." }, 401);
		}

		if (!isAuthor) {
			return c.json({ success: false, error: "You can only delete your own comments." }, 403);
		}

		// Verify the task is public
		const task = taskId
			? await db.query.task.findFirst({
				where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId), eq(t.visible, "public")),
				columns: { id: true },
			})
			: null;

		if (!task) {
			return c.json({ success: false, error: "Task not found or is not public." }, 404);
		}
	}

	// Delete the comment and its history
	await traceAsync(
		"task.comment.delete.transaction",
		() =>
			db.transaction(async (tx) => {
				// Delete comment history first (foreign key constraint)
				await tx
					.delete(schema.taskCommentHistory)
					.where(eq(schema.taskCommentHistory.commentId, commentId));

				// Delete reactions
				await tx
					.delete(schema.taskCommentReaction)
					.where(eq(schema.taskCommentReaction.commentId, commentId));

				// Delete the comment
				await tx
					.delete(schema.taskComment)
					.where(eq(schema.taskComment.id, commentId));
			}),
		{
			description: "Deleting comment and related data",
			data: { orgId, commentId, taskId },
		}
	);

	// Broadcast update
	await traceAsync(
		"task.comment.delete.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"],
				data: { id: taskId },
			};

			broadcastToRoom(orgId, `task:${taskId}`, data, found?.socket, false);
			broadcastPublic(orgId, { ...data }, found?.socket);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting comment deletion to clients" }
	);

	return c.json({ success: true, data: { id: commentId } });
});

// Update comment visibility
apiRouteAdminProjectTask.patch("/update-comment-visibility", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, task_id: taskId, comment_id: commentId, visibility, wsClientId } = await c.req.json();
	const session = c.get("session");

	// Validate visibility value
	if (visibility !== "public" && visibility !== "internal") {
		return c.json({ success: false, error: "Invalid visibility value. Must be 'public' or 'internal'." }, 400);
	}

	// First, check if user is a member of the organization
	const isMember = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isMember) {
		return c.json({ success: false, error: "You don't have permission to access this organization." }, 401);
	}

	// Fetch the comment
	const comment = await traceAsync(
		"task.comment.visibility.lookup",
		() => db.query.taskComment.findFirst({ where: (t) => eq(t.id, commentId) }),
		{ description: "Finding comment to update visibility", data: { commentId } }
	);

	if (!comment) {
		await recordWideError({
			name: "task.comment.visibility.notfound",
			error: new Error("Comment not found"),
			code: "COMMENT_NOT_FOUND",
			message: "Comment not found in database",
			contextData: { orgId, commentId },
		});
		return c.json({ success: false, error: "COMMENT_NOT_FOUND" }, 404);
	}

	// Check if user is the comment author
	const isAuthor = comment.createdBy === session?.userId;

	// Check if user has admin or moderation.manageComments permission
	const hasAdminPermission = await traceOrgPermissionCheck(session?.userId || "", orgId, "admin.administrator");
	const hasModPermission = await traceOrgPermissionCheck(session?.userId || "", orgId, "moderation.manageComments");

	if (!isAuthor && !hasAdminPermission && !hasModPermission) {
		return c.json(
			{ success: false, error: "You don't have permission to change this comment's visibility." },
			403
		);
	}

	// Update the comment visibility
	await traceAsync(
		"task.comment.visibility.update",
		() =>
			db
				.update(schema.taskComment)
				.set({
					visibility,
					updatedAt: new Date(),
				})
				.where(eq(schema.taskComment.id, commentId)),
		{
			description: "Updating comment visibility",
			data: { orgId, commentId, visibility },
		}
	);

	// Broadcast update
	await traceAsync(
		"task.comment.visibility.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"],
				data: { id: taskId },
			};

			broadcastToRoom(orgId, `task:${taskId}`, data, found?.socket, false);
			broadcastPublic(orgId, { ...data }, found?.socket);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting comment visibility update to clients" }
	);

	return c.json({ success: true, data: { id: commentId, visibility } });
});

apiRouteAdminProjectTask.post("/create-reaction", async (c) => {
	const traceAsync = createTraceAsync();

	const { orgId, taskId, wsClientId, comment_id: commentId, emoji } = await c.req.json();

	const session = c.get("session");

	// 1️⃣ Permission check — org members get full access; non-members must be signed in + task must be public
	const isOrgMember = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");

	if (!isOrgMember) {
		if (!session?.userId) {
			return c.json(
				{
					success: false,
					error: "You must be signed in to react.",
				},
				401
			);
		}

		// Verify the task exists and is publicly visible
		const task = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId), eq(t.visible, "public")),
			columns: { id: true },
		});

		if (!task) {
			return c.json(
				{
					success: false,
					error: "Task not found or is not public.",
				},
				404
			);
		}
	}

	// 2️⃣ Insert or toggle reaction
	await traceAsync(
		"task.comment.reaction",
		() => createOrToggleCommentReaction(orgId, taskId, commentId, emoji, session?.userId || ""),
		{
			description: "Adding or removing comment reaction",
			data: { orgId, commentId, emoji, userId: session?.userId },
			onSuccess: (result) => ({
				description: result.added ? "Reaction added successfully" : "Reaction removed successfully",
				data: result,
			}),
		}
	);
	// 3️⃣ Broadcast to relevant clients
	await traceAsync(
		"task.comment.reaction.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"],
				data: { id: taskId },
			};

			broadcastToRoom(orgId, `task:${taskId}`, data, found?.socket, false);
			broadcastPublic(orgId, { ...data }, found?.socket);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting comment reaction update" }
	);
	return c.json({
		success: true,
		data: { commentId },
	});
});

apiRouteAdminProjectTask.get("/get-comment-history", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, task_id: taskId, comment_id: commentId } = c.req.query();
	const session = c.get("session");

	if (!orgId || !taskId || !commentId) {
		await recordWideError({
			name: "task.comment.history.validation",
			error: new Error("Missing required parameters"),
			code: "MISSING_PARAMETERS",
			message: "org_id, task_id, and comment_id are required",
			contextData: { orgId, taskId, commentId },
		});
		return c.json({ success: false, error: "Missing params" }, 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to view comment history.",
			},
			401
		);
	}

	const history = await traceAsync(
		"task.comment.history.fetch",
		() =>
			db
				.select()
				.from(schema.taskCommentHistory)
				.where((t) => and(eq(t.organizationId, orgId), eq(t.taskId, taskId), eq(t.commentId, commentId)))
				.orderBy((t) => [desc(t.editedAt)]),
		{
			description: "Fetching comment history",
			data: { orgId, taskId, commentId, userId: session?.userId },
			onSuccess: (result) => ({
				description: "Task comment history fetched successfully",
				data: { historyCount: result.length },
			}),
		}
	);

	return c.json({ success: true, data: history });
});

apiRouteAdminProjectTask.get("/timeline/activity", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, task_id: taskId } = c.req.query();

	const missingParams = [];
	if (!orgId) missingParams.push("org_id");
	if (!taskId) missingParams.push("task_id");

	if (missingParams.length > 0) {
		await recordWideError({
			name: "task.timeline.activity.validation",
			error: new Error("Missing required parameters"),
			code: "MISSING_PARAMETERS",
			message: `Required: ${missingParams.join(", ")}`,
			contextData: { orgId, taskId, missingParams },
		});
		return c.json(
			{
				success: false,
				error: "MISSING_PARAMETERS",
				message: `The following parameters are required: ${missingParams.join(", ")}`,
			},
			400
		);
	}

	const timeline = await traceAsync("task.timeline.activity", () => getTaskTimeline(orgId || "", taskId || ""), {
		description: "Fetching task timeline activity",
		data: { orgId, taskId },
		onSuccess: (result) => ({
			description: "Task timeline activity fetched successfully",
			data: { resultCount: result.length },
		}),
	});

	return c.json({
		success: true,
		data: timeline,
	});
});

apiRouteAdminProjectTask.get("/timeline/comments", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	try {
		const q = c.req.query();
		const orgId = q.org_id;
		const taskId = q.task_id;

		if (!orgId || !taskId) {
			await recordWideError({
				name: "task.timeline.comments.validation",
				error: new Error("Missing required parameters"),
				code: "MISSING_PARAMETERS",
				message: "org_id and task_id are required",
				contextData: { orgId, taskId },
			});
			return c.json({ success: false, error: "MISSING_PARAMETERS" }, 400);
		}

		const session = c.get("session");

		// 🧩 Permission check
		const isPublic = !session || !(await traceOrgPermissionCheck(session.userId, orgId, "members"));

		const page = Math.max(Number(q.page) || 1, 1);
		const limit = Math.min(Number(q.limit) || 20, 50);
		const offset = (page - 1) * limit;

		const base = and(
			eq(schema.taskComment.organizationId, orgId),
			eq(schema.taskComment.taskId, taskId),
			isPublic ? eq(schema.taskComment.visibility, "public") : undefined
		);

		// 🧮 Count total
		const totalItems = await traceAsync(
			"task.comments.count",
			async () => {
				const [result] = await db.select({ count: sql<number>`count(*)` }).from(schema.taskComment).where(base);
				return Number(result?.count ?? 0);
			},
			{ description: "Counting total comments" }
		);

		const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

		// 🧱 Fetch comments + createdBy + reactions (raw users/emojis)
		const comments = await traceAsync(
			"task.comments.fetch",
			async () => {
				const rows = await db.query.taskComment.findMany({
					where: () => base,
					orderBy: (t, { asc }) => asc(t.createdAt),
					limit,
					offset,
					with: {
						createdBy: {
							columns: userSummaryColumns,
						},
						reactions: {
							columns: { emoji: true, userId: true },
						},
					},
				});

				// 🔄 Aggregate reactions
				const mapped = rows.map((comment) => {
					const grouped: Record<string, { count: number; users: string[] }> = {};

					for (const reaction of comment.reactions ?? []) {
						if (!grouped[reaction.emoji]) {
							grouped[reaction.emoji] = { count: 0, users: [] };
						}

						const reactionGroup = grouped[reaction.emoji];
						if (reactionGroup) {
							reactionGroup.count++;
							reactionGroup.users.push(reaction.userId);
						}
					}

					const total = Object.values(grouped).reduce((sum, r) => sum + r.count, 0);

					return {
						...comment,
						reactions: {
							total,
							reactions: grouped,
						},
						eventType: "comment" as const,
						actor: comment.createdBy,
					};
				});

				return mapped;
			},
			{
				description: "Fetching task comments with reactions",
				data: { orgId, taskId, page, limit, isPublic },
				onSuccess: (result) => ({
					description: "Task comments with reactions fetched",
					data: {
						resultCount: result.length,
						totalItems,
						totalPages,
						userId: session?.userId ?? "anonymous",
					},
				}),
			}
		);

		return c.json({
			success: true,
			data: comments,
			pagination: {
				page,
				limit,
				totalItems,
				totalPages,
				hasMore: page < totalPages,
			},
		});
	} catch (err) {
		await recordWideError({
			name: "task.timeline.comments.error",
			error: err,
			message: "Failed to fetch task comments",
			contextData: {
				path: c.req.path,
				query: c.req.query(),
			},
		});
		return c.json({ success: false, message: (err as Error)?.message }, 500);
	}
});

apiRouteAdminProjectTask.get("/timeline/comments/count", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, task_id: taskId, limit } = c.req.query();

	if (!orgId || !taskId) {
		await recordWideError({
			name: "task.timeline.comments.count.validation",
			error: new Error("Missing required parameters"),
			code: "MISSING_PARAMETERS",
			message: "org_id and task_id are required",
			contextData: { orgId, taskId },
		});
		return c.json({ success: false, error: "MISSING_PARAMETERS" }, 400);
	}

	const perPage = Math.min(Number(limit) || 9, 50);

	const { totalItems, totalPages } = await traceAsync(
		"task.comments.count",
		async () => {
			const result = await db.execute(
				sql<{ count: number }>`
					SELECT count(*)::int AS count
					FROM task_comment
					WHERE organization_id = ${orgId}
					  AND task_id = ${taskId};
				`
			);
			const total = Number(result[0]?.count ?? 0);
			return {
				totalItems: total,
				totalPages: Math.max(Math.ceil(total / perPage), 1),
			};
		},
		{
			description: "Counting task comments",
			data: { orgId, taskId, limit: perPage },
			onSuccess: (result) => ({
				description: "Task comments count fetched successfully",
				data: result,
			}),
		}
	);

	return c.json({
		success: true,
		pagination: { totalItems, totalPages, limit: perPage },
	});
});

apiRouteAdminProjectTask.post("/create-vote", async (c) => {
	const traceAsync = createTraceAsync();

	const { orgId, taskId, wsClientId } = await c.req.json();
	const session = c.get("session");

	// 2️⃣ Anonymous fingerprint (NO IP STORED)
	const ip = getClientIP(c.req.raw);
	const userAgent = c.req.header("user-agent") ?? "unknown";
	const anonHash = getAnonHash(ip, userAgent);
	const userId = session?.userId ?? null;
	// 3️⃣ Insert or toggle vote
	const result = await traceAsync(
		"task.vote.toggle",
		() =>
			createOrToggleTaskVote({
				orgId,
				taskId,
				userId,
				anonHash,
			}),
		{
			description: "Adding or removing task vote",
			data: { orgId, taskId, userId: session?.userId },
			onSuccess: (result) => ({
				description: result.added ? "Vote added successfully" : "Vote removed successfully",
				data: result,
			}),
		}
	);
	const updatedTask = await traceAsync(
		"task.vote.fetch",
		() =>
			db.query.task.findFirst({
				columns: { id: true, voteCount: true },
				where: eq(schema.task.id, taskId),
			}),
		{ description: "Fetching updated task vote count" }
	);
	// 4️⃣ Broadcast to relevant clients
	await traceAsync(
		"task.vote.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK_VOTE" as WSBaseMessage["type"],
				data: {
					id: taskId,
					voteCount: updatedTask?.voteCount ?? 0,
				},
			};

			broadcastToRoom(orgId, `task:${taskId}`, data, found?.socket, false);
			broadcastPublic(orgId, { ...data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						broadcastIndividual(client.socket, data, orgId)
				);
			});
		},
		{ description: "Broadcasting task vote update" }
	);

	return c.json({
		success: true,
		data: { taskId, voted: result.added, voteCount: updatedTask?.voteCount ?? 0 },
	});
});

apiRouteAdminProjectTask.get("/voted", async (c) => {
	const traceAsync = createTraceAsync();

	const orgId = c.req.query("orgId");
	const session = c.get("session");

	if (!orgId) {
		return c.json({ success: false, error: "Missing orgId" }, 400);
	}

	// Identity (same as voting)
	const ip = getClientIP(c.req.raw);
	const userAgent = c.req.header("user-agent") ?? "unknown";
	const anonHash = getAnonHash(ip, userAgent);
	const userId = session?.userId ?? null;

	const votedTasks = await traceAsync(
		"task.vote.list.compact",
		() =>
			db
				.select({
					taskId: schema.task.id,
					voteCount: schema.task.voteCount,
					count: sql<number>`1`,
				})
				.from(schema.taskVote)
				.innerJoin(schema.task, eq(schema.task.id, schema.taskVote.taskId))
				.where(
					and(
						eq(schema.taskVote.organizationId, orgId),
						or(userId ? eq(schema.taskVote.userId, userId) : undefined, eq(schema.taskVote.anonHash, anonHash))
					)
				)
				.orderBy(desc(schema.task.voteCount)),
		{ description: "Fetching voted tasks (compact)" }
	);

	return c.json({
		success: true,
		data: {
			tasks: votedTasks,
		},
	});
});

function baseTaskWhere(orgId: string, categoryId?: string, search?: string) {
	const conditions = [
		eq(schema.task.organizationId, orgId),
		or(eq(schema.task.status, "todo"), eq(schema.task.status, "in-progress"), eq(schema.task.status, "backlog")),
		eq(schema.task.visible, "public"),
	];

	if (categoryId) {
		conditions.push(eq(schema.task.category, categoryId));
	}

	if (search && search.trim().length > 0) {
		const pattern = `%${search.trim()}%`;

		conditions.push(
			or(
				ilike(schema.task.title, pattern),

				// Fuzzy match against JSON description
				sql<boolean>`
					${schema.task.description}::text ILIKE ${pattern}
				`
			)
		);
	}

	return and(...conditions);
}
apiRouteAdminProjectTask.get("/tasks", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	try {
		const query = c.req.query();
		const sortBy =
			query.sortBy === "newest" || query.sortBy === "trending" || query.sortBy === "mostPopular"
				? query.sortBy
				: "mostPopular";
		const searchQuery = typeof query.q === "string" && query.q.trim().length > 0 ? query.q.trim() : undefined;
		const category_id = query.category_id;
		const orgId = query.org_id;
		const page = Math.max(Number(query.page) || 1, 1);
		const requestedLimit = Number(query.limit);
		const limit = Math.min(requestedLimit || 15, 30);
		const offset = (page - 1) * limit;
		if (!orgId) {
			await recordWideError({
				name: "organization.tasks.missing_org_id",
				error: new Error("Missing organization id"),
				code: "BAD_REQUEST",
				message: "Organization id is required",
				contextData: {
					orgId,
				},
			});

			return c.json(errorResponse("Missing organization id", "Route parameter `org_id` is required"), 400);
		}
		if (requestedLimit > 20) {
			await recordWideError({
				name: "organization.tasks.limit_overflow",
				error: new Error("Limit overflow"),
				code: "LIMIT_OVERFLOW",
				message: `Requested limit ${requestedLimit} exceeds max ${20}`,
				contextData: { orgId, requestedLimit },
			});

			return c.json(errorResponse("Invalid limit", `Query parameter \`limit\` must be between 1 and ${20}`), 400);
		}

		const totalItems = await traceAsync(
			"organization.tasks.count",
			async () => {
				const [result] = await db
					.select({ count: sql<number>`count(*)` })
					.from(schema.task)
					.where(baseTaskWhere(orgId, category_id, searchQuery));

				return Number(result?.count ?? 0);
			},
			{
				description: "Counting tasks for organization",
				data: { orgId },
			}
		);
		const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
		const isTrending = sortBy === "trending";
		const rows = await traceAsync(
			"organization.tasks.fetch",
			async () =>
				db.query.task.findMany({
					where: baseTaskWhere(orgId, category_id, searchQuery),

					// ✅ DB handles ordering when possible
					orderBy: isTrending
						? undefined
						: (t, { desc }) => {
							if (sortBy === "newest") {
								return [desc(t.createdAt)];
							}

							// mostPopular
							return [desc(t.voteCount), desc(t.createdAt)];
						},

					limit: isTrending ? limit * 5 : limit,
					offset: isTrending ? 0 : offset,

					with: {
						labels: { with: { label: true } },
						createdBy: {
							columns: userSummaryColumns,
						},
						assignees: {
							with: {
								user: {
									columns: userSummaryColumns,
								},
							},
						},
						comments: {
							columns: { id: true, visibility: true },
						},
						githubIssue: true,
					},
				}),
			{
				description: "Fetching tasks with relations",
				data: {
					orgId,
					sortBy,
					limit,
					offset,
				},
			}
		);

		const tasks = await traceAsync(
			"organization.tasks.sort",
			async () => {
				let normalized = rows.map((task) => ({
					...task,
					labels: task.labels.map((l) => l.label).filter((l) => l.visible === "public"),
					assignees: task.assignees.map((a) => a.user),
					comments: task.comments?.filter((c) => c.visibility === "public"),
				})) as schema.TaskWithLabels[];

				if (!isTrending) {
					return normalized;
				}

				// ✅ Trending sort (app-layer only)
				const now = Date.now();

				normalized = normalized.sort((a, b) => {
					const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
					const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;

					const aHours = Math.max((now - aDate) / 36e5, 0);
					const bHours = Math.max((now - bDate) / 36e5, 0);

					const aActivity = (a.voteCount ?? 0) + (a.comments?.length ?? 0);
					const bActivity = (b.voteCount ?? 0) + (b.comments?.length ?? 0);

					const aScore = aActivity / Math.pow(aHours + 2, 1.5);
					const bScore = bActivity / Math.pow(bHours + 2, 1.5);

					if (bScore !== aScore) {
						return bScore - aScore;
					}

					return bDate - aDate;
				});

				// ✅ paginate AFTER trending sort
				return normalized.slice(offset, offset + limit);
			},
			{
				description: "Sorting tasks",
				data: { sortBy, page, limit },
			}
		);

		return c.json(
			paginatedSuccessResponse(tasks, {
				limit,
				page,
				totalPages,
				totalItems,
				hasMore: page < totalPages,
			}),
			200
		);
	} catch (err) {
		await recordWideError({
			name: "organization.tasks.error",
			error: err,
			message: "Failed to fetch organization tasks",
			contextData: { path: c.req.path, query: c.req.query() },
		});

		return c.json(errorResponse("Database error", "Unexpected error"), 500);
	}
});
