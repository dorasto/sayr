import { Octokit } from "@octokit/rest";
import {
	addLabelToTask,
	addLogEventTask,
	createComment,
	createOrToggleCommentReaction,
	createTask,
	db,
	getMergedTaskActivity,
	getOrganizationMembers,
	getTaskById,
	getTaskTimeline,
	hasOrgPermission,
	removeLabelFromTask,
	schema,
} from "@repo/database";
import { getInstallationToken } from "@repo/util/github/auth";
import { and, desc, eq, sql } from "drizzle-orm";
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
} from "../ws";
import { createTraceAsync } from "@repo/opentelemetry/trace";

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
	} = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "tasks.create"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);

	if (!isAuthorized) {
		return c.json(
			{ success: false, error: "You don't have permission to create tasks." },
			401,
		);
	}

	const task = await traceAsync(
		"task.create.insert",
		() =>
			createTask(
				orgId,
				{ title, description, status, priority, category },
				session?.userId,
			),
		{
			description: "Creating task record",
			data: { orgId, title, status, priority, category },
		},
	);

	if (!task) {
		await recordWideError({
			name: "task.create.failed",
			error: new Error("Task creation failed"),
			code: "TASK_CREATION_FAILED",
			message: "Failed to create task in database",
			contextData: { orgId, title },
		});
		return c.json(
			{ success: false, path: c.req.path, error: "Failed to create task" },
			500,
		);
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
				description,
			);
		},
		{
			description: "Adding labels, assignees, and log event",
			data: {
				taskId: task.id,
				labelCount: labels?.length ?? 0,
				assigneeCount: assignees?.length ?? 0,
			},
		},
	);

	const taskWithData = await traceAsync(
		"task.create.refetch",
		() => getTaskById(orgId, task.id),
		{
			description: "Fetching created task with relations",
		},
	);

	await traceAsync(
		"task.create.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "CREATE_TASK" as WSBaseMessage["type"],
				data: taskWithData,
			};

			broadcast(orgId, `tasks`, data, found?.socket);
			broadcastPublic(orgId, { ...data, data: data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.channel !== "tasks" &&
						broadcastIndividual(client.socket, data, orgId),
				);
			});
		},
		{ description: "Broadcasting new task to clients" },
	);

	await traceAsync(
		"task.create.github_sync",
		async () => {
			const foundLink = await db.query.githubRepository.findFirst({
				where: and(
					eq(schema.githubRepository.organizationId, orgId),
					eq(schema.githubRepository.categoryId, category),
				),
			});

			if (!foundLink || !taskWithData) return;

			const token = await getInstallationToken(foundLink.installationId);
			const octokit = new Octokit({ auth: token });

			const { data: repoInfo } = await octokit.request(
				"GET /repositories/{repository_id}",
				{
					repository_id: foundLink.repoId,
				},
			);

			const owner = repoInfo.owner.login;
			const repo = repoInfo.name;

			const { data: issue } = await octokit.request(
				"POST /repos/{owner}/{repo}/issues",
				{
					owner,
					repo,
					title,
				},
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
		},
	);

	return c.json({ success: true, data: taskWithData });
});

// Update task details
apiRouteAdminProjectTask.patch("/update", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		wsClientId,
		task_id: taskId,
		...updates
	} = await c.req.json();
	const session = c.get("session");
	const isSystemAccount = session?.userId === process.env.SYSTEM_ACCOUNT_ID;

	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "members"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);

	if (!isAuthorized && !isSystemAccount) {
		return c.json(
			{ success: false, error: "You don't have permission to update tasks." },
			401,
		);
	}

	const existingTask = await traceAsync(
		"task.update.lookup",
		() =>
			db.query.task.findFirst({
				where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
			}),
		{ description: "Finding task to update", data: { orgId, taskId } },
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
	["title", "description", "status", "priority", "category"].forEach(
		(field) => {
			if (updates[field] !== undefined) {
				// @ts-expect-error dynamic field
				allowed[field] = updates[field];
			}
		},
	);

	await traceAsync(
		"task.update.save",
		async () => {
			if (Object.keys(allowed).length > 0) {
				await db
					.update(schema.task)
					.set({ ...allowed, updatedAt: new Date() })
					.where(
						and(
							eq(schema.task.id, taskId),
							eq(schema.task.organizationId, orgId),
						),
					)
					.returning();
			}

			if (updates.category && updates.category !== existingTask.category) {
				await addLogEventTask(
					taskId,
					orgId,
					"category_change",
					existingTask.category,
					updates.category,
					session?.userId,
				);
			}
			if (updates.status && updates.status !== existingTask.status) {
				await addLogEventTask(
					taskId,
					orgId,
					"status_change",
					existingTask.status,
					updates.status,
					session?.userId,
				);
			}
			if (updates.priority && updates.priority !== existingTask.priority) {
				await addLogEventTask(
					taskId,
					orgId,
					"priority_change",
					existingTask.priority,
					updates.priority,
					session?.userId,
				);
			}
			if (updates.title && updates.title !== existingTask.title) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					existingTask.title,
					updates.title,
					session?.userId,
				);
			}
			if (
				updates.description &&
				JSON.stringify(updates.description) !==
					JSON.stringify(existingTask.description)
			) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					existingTask.description,
					updates.description,
					session?.userId,
					updates.description,
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
		},
	);

	const taskWithData = await traceAsync(
		"task.update.refetch",
		() => getTaskById(orgId, taskId),
		{
			description: "Refetching updated task data",
		},
	);

	await traceAsync(
		"task.update.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK" as WSBaseMessage["type"],
				data: taskWithData,
			};

			broadcastToRoom(orgId, `tasks;task:${taskId}`, data, found?.socket, true);
			broadcastPublic(orgId, { ...data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						!(
							client.channel === `task:${taskId}` || client.channel === "tasks"
						) &&
						broadcastIndividual(client.socket, data, orgId),
				);
			});
		},
		{ description: "Broadcasting task update to clients" },
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
	const isSystemAccount = session?.userId === process.env.SYSTEM_ACCOUNT_ID;

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
			401,
		);
	}

	const existingTask = await traceAsync(
		"task.github_link.task_lookup",
		() =>
			db.query.task.findFirst({
				where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
			}),
		{ description: "Finding task to link", data: { orgId, taskId } },
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
		{ description: "Finding repository", data: { orgId, repoId } },
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
		{ description: "Checking for existing link", data: { orgId, taskId } },
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
		},
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
			broadcastPublic(orgId, { ...data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						!(
							client.channel === `task:${taskId}` || client.channel === "tasks"
						) && broadcastIndividual(client.socket, data, orgId),
				);
			});
		},
		{ description: "Broadcasting GitHub link update to clients" },
	);

	return c.json({ success: true, data: newLink });
});

// Update task labels
apiRouteAdminProjectTask.post("/update-labels", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		wsClientId,
		task_id: taskId,
		labels,
	} = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "members"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);

	if (!isAuthorized) {
		return c.json(
			{ success: false, error: "You don't have permission to update labels." },
			401,
		);
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
			},
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
						await addLogEventTask(
							taskId,
							orgId,
							"label_added",
							null,
							labelId,
							session?.userId,
						);
					}
				}

				for (const labelId of currentLabelIds) {
					if (!incomingLabelIds.includes(labelId)) {
						await removeLabelFromTask(orgId, taskId, labelId);
						await addLogEventTask(
							taskId,
							orgId,
							"label_removed",
							null,
							labelId,
							session?.userId,
						);
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
						added: incomingLabelIds.filter(
							(id) => !currentLabelIds.includes(id),
						),
						removed: currentLabelIds.filter(
							(id) => !incomingLabelIds.includes(id),
						),
					},
				}),
			},
		);

		const taskWithData = await traceAsync(
			"task.labels.update.refetch",
			() => getTaskById(orgId, taskId),
			{
				description: "Refetching updated task data",
			},
		);

		await traceAsync(
			"task.labels.update.broadcast",
			async () => {
				const found = findClientByWsId(wsClientId);
				const data = {
					type: "UPDATE_TASK" as WSBaseMessage["type"],
					data: taskWithData,
				};

				broadcastToRoom(
					orgId,
					`tasks;task:${taskId}`,
					data,
					found?.socket,
					true,
				);
				broadcastPublic(orgId, { ...data });

				const members = await getOrganizationMembers(orgId);
				members.forEach((member) => {
					const clients = findClientsByUserId(member.userId);
					clients.forEach(
						(client) =>
							client.wsClientId !== wsClientId &&
							!(
								client.channel === `task:${taskId}` ||
								client.channel === "tasks"
							) &&
							broadcastIndividual(client.socket, data, orgId),
					);
				});
			},
			{ description: "Broadcasting label update to clients" },
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

	const {
		org_id: orgId,
		wsClientId,
		task_id: taskId,
		assignees,
	} = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "tasks.assign"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to update assignees.",
			},
			401,
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
								user: { columns: { id: true, name: true, image: true } },
							},
						},
					},
				}),
			{
				description: "Finding task with current assignees",
				data: { orgId, taskId },
			},
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
						await addLogEventTask(
							taskId,
							orgId,
							"assignee_added",
							null,
							userId,
							session?.userId,
						);
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
									eq(schema.taskAssignee.userId, userId),
								),
							);
						await addLogEventTask(
							taskId,
							orgId,
							"assignee_removed",
							null,
							userId,
							session?.userId,
						);
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
						added: incomingAssigneeIds.filter(
							(id) => !currentAssigneeIds.includes(id),
						),
						removed: currentAssigneeIds.filter(
							(id) => !incomingAssigneeIds.includes(id),
						),
					},
				}),
			},
		);

		const taskWithData = await traceAsync(
			"task.assignees.update.refetch",
			() => getTaskById(orgId, taskId),
			{
				description: "Refetching updated task data",
			},
		);

		await traceAsync(
			"task.assignees.update.broadcast",
			async () => {
				const found = findClientByWsId(wsClientId);
				const data = {
					type: "UPDATE_TASK" as WSBaseMessage["type"],
					data: taskWithData,
				};

				broadcastToRoom(
					orgId,
					`tasks;task:${taskId}`,
					data,
					found?.socket,
					true,
				);
				broadcastPublic(orgId, { ...data });

				const members = await getOrganizationMembers(orgId);
				members.forEach((member) => {
					const clients = findClientsByUserId(member.userId);
					clients.forEach(
						(client) =>
							client.wsClientId !== wsClientId &&
							!(
								client.channel === `task:${taskId}` ||
								client.channel === "tasks"
							) &&
							broadcastIndividual(client.socket, data, orgId),
					);
				});
			},
			{ description: "Broadcasting assignee update to clients" },
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

	const {
		org_id: orgId,
		wsClientId,
		task_id: taskId,
		content,
		visibility,
	} = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "members"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to create comments.",
			},
			401,
		);
	}

	await traceAsync(
		"task.comment.create.insert",
		() => createComment(orgId, taskId, content, visibility, session?.userId),
		{
			description: "Creating task comment",
			data: { orgId, taskId, visibility, userId: session?.userId },
			onSuccess: () => ({
				description: "Task comment created successfully",
				data: {},
			}),
		},
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
			broadcastPublic(orgId, { ...data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(
							client.channel === `task:${taskId}` || client.channel === "tasks"
						) &&
						broadcastIndividual(client.socket, data, orgId),
				);
			});
		},
		{ description: "Broadcasting new comment to clients" },
	);

	return c.json({ success: true, data: { id: taskId } });
});

// Edit a comment on a task
apiRouteAdminProjectTask.put("/edit-comment", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		wsClientId,
		comment_id: commentId,
		content,
		visibility,
	} = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "members"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);

	if (!isAuthorized) {
		return c.json(
			{ success: false, error: "You don't have permission to edit comments." },
			401,
		);
	}

	const comment = await traceAsync(
		"task.comment.edit.lookup",
		() => db.query.taskComment.findFirst({ where: (t) => eq(t.id, commentId) }),
		{ description: "Finding comment to edit", data: { commentId } },
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

	await traceAsync(
		"task.comment.edit.transaction",
		() =>
			db.transaction(async (tx) => {
				await tx
					.update(schema.taskComment)
					.set({
						content,
						visibility: visibility ?? comment.visibility,
						updatedAt: new Date(),
					})
					.where(eq(schema.taskComment.id, commentId));

				await tx.insert(schema.taskCommentHistory).values({
					organizationId: comment.organizationId,
					taskId: comment.taskId,
					commentId: comment.id,
					editedBy: session?.userId,
					content,
				});
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
		},
	);

	await traceAsync(
		"task.comment.edit.broadcast",
		async () => {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"],
				data: { id: comment.taskId },
			};

			broadcastToRoom(
				orgId,
				`task:${comment.taskId}`,
				data,
				found?.socket,
				false,
			);
			broadcastPublic(orgId, { ...data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(
							client.channel === `task:${comment.taskId}` ||
							client.channel === "tasks"
						) &&
						broadcastIndividual(client.socket, data, orgId),
				);
			});
		},
		{ description: "Broadcasting comment update to clients" },
	);

	return c.json({ success: true, data: { id: comment.taskId } });
});

apiRouteAdminProjectTask.post("/create-reaction", async (c) => {
	const traceAsync = createTraceAsync();

	const {
		orgId,
		taskId,
		wsClientId,
		comment_id: commentId,
		emoji,
	} = await c.req.json();

	const session = c.get("session");

	// 1️⃣ Permission check
	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "members"),
		{
			description: "Checking permissions for reaction",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to react to comments",
						};
			},
		},
	);

	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to react to comments.",
			},
			401,
		);
	}

	// 2️⃣ Insert or toggle reaction
	await traceAsync(
		"task.comment.reaction",
		() =>
			createOrToggleCommentReaction(
				orgId,
				taskId,
				commentId,
				emoji,
				session?.userId || "",
			),
		{
			description: "Adding or removing comment reaction",
			data: { orgId, commentId, emoji, userId: session?.userId },
			onSuccess: (result) => ({
				description: result.added
					? "Reaction added successfully"
					: "Reaction removed successfully",
				data: result,
			}),
		},
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
			broadcastPublic(orgId, { ...data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.wsClientId !== wsClientId &&
						client.orgId !== orgId &&
						!(
							client.channel === `task:${taskId}` || client.channel === "tasks"
						) &&
						broadcastIndividual(client.socket, data, orgId),
				);
			});
		},
		{ description: "Broadcasting comment reaction update" },
	);
	return c.json({
		success: true,
		data: { commentId },
	});
});

apiRouteAdminProjectTask.get("/get-comment-history", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		task_id: taskId,
		comment_id: commentId,
	} = c.req.query();
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

	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", orgId, "members"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { orgId, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);
	if (!isAuthorized) {
		return c.json(
			{
				success: false,
				error: "You don't have permission to view comment history.",
			},
			401,
		);
	}

	const history = await traceAsync(
		"task.comment.history.fetch",
		() =>
			db
				.select()
				.from(schema.taskCommentHistory)
				.where((t) =>
					and(
						eq(t.organizationId, orgId),
						eq(t.taskId, taskId),
						eq(t.commentId, commentId),
					),
				)
				.orderBy((t) => [desc(t.editedAt)]),
		{
			description: "Fetching comment history",
			data: { orgId, taskId, commentId, userId: session?.userId },
			onSuccess: (result) => ({
				description: "Task comment history fetched successfully",
				data: { historyCount: result.length },
			}),
		},
	);

	return c.json({ success: true, data: history });
});

// Get merged task activity timeline
apiRouteAdminProjectTask.get("/timeline", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideEvent = c.get("recordWideEvent");
	await recordWideEvent({
		name: "task.timeline.fetch",
		description: "Get task timeline requested",
		data: {},
	});

	const query = c.req.query();
	const org_id = query.org_id;
	const task_id = query.task_id;

	const missingParams = [];
	if (!org_id) missingParams.push("org_id");
	if (!task_id) missingParams.push("task_id");

	if (missingParams.length > 0) {
		await recordWideEvent({
			name: "task.timeline.fetch",
			description: "Missing required parameters for timeline",
			data: {
				type: "ValidationError",
				code: "MISSING_PARAMETERS",
				message: `Required: ${missingParams.join(", ")}`,
			},
		});
		return c.json(
			{
				success: false,
				error: "MISSING_PARAMETERS",
				message: `The following parameters are required: ${missingParams.join(", ")}`,
			},
			400,
		);
	}

	const session = c.get("session");

	const isAuthorized = await traceAsync(
		"hasOrgPermission",
		() => hasOrgPermission(session?.userId || "", org_id || "", "members"),
		{
			description: "Checking permissions",
			data: {},
			onSuccess: (result) => {
				return result
					? {
							description: "Permission granted",
							data: { org_id, userId: session?.userId },
						}
					: {
							description: "User does not have permission to do that",
						};
			},
		},
	);

	if (!isAuthorized) {
		const timeline = await getMergedTaskActivity(
			org_id || "",
			task_id || "",
			true,
		);
		await recordWideEvent({
			name: "task.timeline.fetch",
			description: "Task timeline fetched (unauthorized – public mode)",
			data: {
				organizationId: org_id,
				requestedByUserId: session?.userId || "",
				taskId: task_id,
				authorized: false,
			},
		});
		return c.json({ success: true, data: timeline });
	}

	const timeline = await getMergedTaskActivity(
		org_id || "",
		task_id || "",
		false,
	);

	await recordWideEvent({
		name: "task.timeline.fetch",
		description: "Task timeline fetched successfully",
		data: {
			organizationId: org_id,
			requestedByUserId: session?.userId || "",
			taskId: task_id,
			authorized: true,
		},
	});

	return c.json({
		success: true,
		data: timeline,
	});
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
			400,
		);
	}

	const timeline = await traceAsync(
		"task.timeline.activity",
		() => getTaskTimeline(orgId || "", taskId || ""),
		{
			description: "Fetching task timeline activity",
			data: { orgId, taskId },
			onSuccess: (result) => ({
				description: "Task timeline activity fetched successfully",
				data: { resultCount: result.length },
			}),
		},
	);

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
		const isPublic = await traceAsync(
			"hasOrgPermission",
			async () =>
				!session ||
				!(await hasOrgPermission(session?.userId, orgId, "members")),
			{
				description: "Checking org membership for comment timeline",
				data: {},
				onSuccess: (result) =>
					result
						? {
								description: "Public organization (no member access required)",
								data: { orgId },
							}
						: {
								description: "Permission granted",
								data: { orgId, userId: session?.userId },
							},
			},
		);

		const page = Math.max(Number(q.page) || 1, 1);
		const limit = Math.min(Number(q.limit) || 20, 50);
		const offset = (page - 1) * limit;

		const base = and(
			eq(schema.taskComment.organizationId, orgId),
			eq(schema.taskComment.taskId, taskId),
			isPublic ? eq(schema.taskComment.visibility, "public") : undefined,
		);

		// 🧮 Count total
		const totalItems = await traceAsync(
			"task.comments.count",
			async () => {
				const [result] = await db
					.select({ count: sql<number>`count(*)` })
					.from(schema.taskComment)
					.where(base);
				return Number(result?.count ?? 0);
			},
			{ description: "Counting total comments" },
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
							columns: { name: true, image: true },
						},
						reactions: {
							columns: { emoji: true, userId: true },
						},
					},
				});

				// 🔄 Aggregate reactions
				const mapped = rows.map((comment) => {
					const grouped: Record<string, { count: number; users: string[] }> =
						{};

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

					const total = Object.values(grouped).reduce(
						(sum, r) => sum + r.count,
						0,
					);

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
			},
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
				`,
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
		},
	);

	return c.json({
		success: true,
		pagination: { totalItems, totalPages, limit: perPage },
	});
});
