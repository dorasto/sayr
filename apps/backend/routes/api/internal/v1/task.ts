import { Octokit } from "@octokit/rest";
import {
	addLabelToTask,
	addLogEventTask,
	createComment,
	createOrToggleCommentReaction,
	createOrToggleTaskVote,
	createTask,
	createNotifications,
	createNotification,
	extractUserMentions,
	extractTaskMentions,
	getTaskAssigneeIds,
	getCommentReplies,
	getCommentReplyCountBatch,
	getBlockedUserIds,
	db,
	getOrganizationMembers,
	getTaskById,
	getIssueTemplateById,
	getTaskTimeline,
	removeLabelFromTask,
	schema,
	userSummaryColumns,
	setTaskParent,
	removeTaskParent,
	getSubtasks,
	createTaskRelation,
	removeTaskRelation,
	getTaskRelations,
	searchTasksByOrganization,
} from "@repo/database";
import { getInstallationToken } from "@repo/util/github/auth";
import { and, desc, eq, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { getAnonHash, getClientIP, traceOrgPermissionCheck, tracePublicOrgAccessCheck } from "@/util";
import { errorResponse, paginatedSuccessResponse } from "../../../../responses";
import { findClientBysseId, sseBroadcastToRoom, sseBroadcastPublic, sseBroadcastIndividual, findSSEClientsByUserId, sseBroadcastByUserId } from "@/routes/events";
import type { ServerEventBaseMessage } from "@/routes/events/types";

export const apiRouteAdminProjectTask = new Hono<AppEnv>();

/**
 * Creates notifications for task assignees and broadcasts them via WebSocket.
 * Runs async (fire-and-forget) to avoid blocking the response.
 */
async function notifyAssignees(params: {
	taskId: string;
	orgId: string;
	actorId: string | undefined;
	type: (typeof schema.notificationTypeEnum.enumValues)[number];
	timelineEventId?: string;
}) {
	try {
		const assigneeIds = await getTaskAssigneeIds(params.taskId);
		if (assigneeIds.length === 0) return;

		const notifications = await createNotifications({
			organizationId: params.orgId,
			userIds: assigneeIds,
			actorId: params.actorId ?? null,
			taskId: params.taskId,
			timelineEventId: params.timelineEventId ?? null,
			type: params.type,
		});

		// Broadcast to each recipient via WebSocket
		for (const notif of notifications) {
			sseBroadcastByUserId(notif.userId, "", params.orgId, {
				type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
				data: notif,
				meta: { ts: Date.now() },
			});
		}
	} catch {
		// Notification failures should never break task operations
	}
}

/**
 * Creates mention notifications by extracting @mentions from content.
 * Unlike other notification types, mentions do NOT filter out the actor —
 * if you explicitly @mention yourself, you should still receive the notification.
 */
async function notifyMentions(params: {
	taskId: string;
	orgId: string;
	actorId: string | undefined;
	content: schema.NodeJSON | null | undefined;
	timelineEventId?: string;
}) {
	try {
		const mentionedUserIds = extractUserMentions(params.content);
		if (mentionedUserIds.length === 0) return;

		// Use individual createNotification (not bulk) to avoid actor filtering.
		// Mentions are explicit — the user typed @someone — so self-mentions are intentional.
		const dedupedIds = [...new Set(mentionedUserIds)];
		for (const userId of dedupedIds) {
			const notif = await createNotification({
				organizationId: params.orgId,
				userId,
				actorId: params.actorId ?? null,
				taskId: params.taskId,
				timelineEventId: params.timelineEventId ?? null,
				type: "mention",
			});

			if (notif) {
				sseBroadcastByUserId(notif.userId, "", params.orgId, {
					type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
					data: notif,
					meta: { ts: Date.now() },
				});
			}
		}
	} catch {
		// Notification failures should never break task operations
	}
}

// Create a new task
apiRouteAdminProjectTask.post("/create", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const body = await c.req.json();

	const {
		org_id: orgId,
		sseClientId,
		title,
		description,
		status,
		priority,
		labels,
		assignees,
		category,
		releaseId,
		parentId,
	} = body;
	let { visible } = body as {
		visible?: "public" | "private";
	};
	const session = c.get("session");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "tasks.create");

	if (!isAuthorized) {
		return c.json({ success: false, error: "You don't have permission to create tasks." }, 401);
	}
	const isPublicAccess = await tracePublicOrgAccessCheck(
		orgId,
		"enablePublicPage"
	);

	// If public page is OFF → force private
	if (!isPublicAccess) {
		visible = "private";
	} else {
		// If public is allowed, respect request (default to private if undefined)
		visible = visible === "public" ? "public" : "private";
	}
	const task = await traceAsync(
		"task.create.insert",
		() => createTask(orgId, { title, description, status, priority, category, releaseId, visible, parentId }, session?.userId),
		{
			description: "Creating task record",
			data: { orgId, title, status, priority, category, releaseId, visible, parentId },
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

	// If created as a subtask, log timeline events on both child and parent
	if (parentId) {
		await traceAsync(
			"task.create.parent_link",
			async () => {
				await Promise.all([
					addLogEventTask(task.id, orgId, "parent_added", null, parentId, session?.userId),
					addLogEventTask(parentId, orgId, "subtask_added", null, task.id, session?.userId),
				]);
			},
			{ description: "Logging parent/subtask timeline events", data: { taskId: task.id, parentId } },
		);
	}

	const taskWithData = await traceAsync("task.create.refetch", () => getTaskById(orgId, task.id), {
		description: "Fetching created task with relations",
	});

	await traceAsync(
		"task.create.broadcast",
		async () => {
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "CREATE_TASK" as ServerEventBaseMessage["type"],
				data: taskWithData,
			};

			sseBroadcastToRoom(orgId, `tasks`, data, found?.id);
			if (taskWithData?.visible === "public") {
				sseBroadcastPublic(orgId, { ...data, data: data }, found?.id);
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						client.channel !== "tasks" &&
						sseBroadcastIndividual(client, data, orgId)
				);
			});
		},
		{ description: "Broadcasting new task to clients" }
	);

	// If created as a subtask, broadcast an update to the parent so other clients see the new subtask count
	if (parentId) {
		await traceAsync(
			"task.create.broadcast_parent",
			async () => {
				const parentWithData = await getTaskById(orgId, parentId);
				if (parentWithData) {
					const found = findClientBysseId(sseClientId);
					const parentUpdate = { type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: parentWithData };
					sseBroadcastToRoom(orgId, `tasks;task:${parentId}`, parentUpdate, found?.id, true);
				}
			},
			{ description: "Broadcasting parent task update for new subtask", data: { parentId } },
		);
	}

	await traceAsync(
		"task.create.github_sync",
		async () => {
			let foundLink = null;

			// 1️⃣ Try exact category match (if category provided)
			if (category) {
				foundLink = await db.query.githubRepository.findFirst({
					where: and(
						eq(schema.githubRepository.organizationId, orgId),
						eq(schema.githubRepository.categoryId, category),
						eq(schema.githubRepository.enabled, true)
					),
				});
			}

			// 2️⃣ Fallback to catch-all (categoryId IS NULL)
			if (!foundLink) {
				foundLink = await db.query.githubRepository.findFirst({
					where: and(
						eq(schema.githubRepository.organizationId, orgId),
						isNull(schema.githubRepository.categoryId),
						eq(schema.githubRepository.enabled, true)
					),
				});
			}

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

// Create a task as a public (non-member) user
apiRouteAdminProjectTask.post("/public-create", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const body = await c.req.json();

	const {
		org_id: orgId,
		sseClientId,
		title,
		description,
		priority,
		labels,
		category,
		templateId,
	} = body;

	const session = c.get("session");

	// Must be signed in
	if (!session?.userId) {
		return c.json({ success: false, error: "You must be signed in to create a task." }, 401);
	}

	// Check publicActions + enablePublicPage are both on
	const isPublicAccess = await tracePublicOrgAccessCheck(orgId);
	if (!isPublicAccess) {
		return c.json({ success: false, error: "Public task creation is not enabled for this organization." }, 403);
	}

	// Blocked users cannot create tasks
	const blockedIds = await getBlockedUserIds(orgId);
	if (blockedIds.includes(session.userId)) {
		return c.json({ success: false, error: "You do not have permission to perform this action." }, 403);
	}

	// Read org settings to enforce public task field restrictions
	const org = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
		columns: { settings: true },
	});

	if (!org) {
		return c.json({ success: false, error: "Organization not found." }, 404);
	}

	const settings = org.settings as import("@repo/database").OrganizationSettings | null;
	const publicTaskFields = settings?.publicTaskFields;

	// If a template was selected, load it server-side so we get the full data
	// (assignees, status, release, visibility, etc.) that the frontend never sends.
	const template = templateId
		? await traceAsync("task.public_create.load_template", () => getIssueTemplateById(templateId), {
			description: "Loading issue template for public task creation",
			data: { templateId },
		})
		: null;

	// Validate the template belongs to this org
	if (template && template.organizationId !== orgId) {
		return c.json({ success: false, error: "Invalid template." }, 400);
	}

	// Resolve fields: user-provided values take precedence, fall back to template,
	// then to safe defaults. Field restrictions only apply to user-editable fields.
	const resolvedPriority = publicTaskFields?.priority === false
		? (template?.priority || "none")
		: (priority || template?.priority || "none");
	const resolvedLabels: string[] = publicTaskFields?.labels === false
		? (template?.labels?.map((l) => l.id) || [])
		: (labels?.length > 0 ? labels : template?.labels?.map((l) => l.id) || []);
	const resolvedCategory = publicTaskFields?.category === false
		? (template?.categoryId || null)
		: (category || template?.categoryId || null);

	// Template-only fields: these are never user-editable on the public form,
	// so they always come from the template (or safe defaults).
	const resolvedStatus = (template?.status || "backlog") as "backlog" | "todo" | "in-progress" | "done" | "canceled";
	const resolvedAssignees: string[] = template?.assignees?.map((a) => a.id) || [];
	const resolvedReleaseId = template?.releaseId || null;
	const resolvedVisible = template?.visible || "public";
	const resolvedParentId: string | null = null; // Templates don't set parent

	// Public tasks are always visible=public unless the template sets private
	const task = await traceAsync(
		"task.public_create.insert",
		() => createTask(orgId, {
			title,
			description: description || template?.description || undefined,
			status: resolvedStatus,
			priority: resolvedPriority,
			category: resolvedCategory,
			releaseId: resolvedReleaseId,
			visible: resolvedVisible,
			parentId: resolvedParentId,
		}, session.userId),
		{
			description: "Creating public task record",
			data: { orgId, title, priority: resolvedPriority, category: resolvedCategory, templateId },
		}
	);

	if (!task) {
		await recordWideError({
			name: "task.public_create.failed",
			error: new Error("Public task creation failed"),
			code: "PUBLIC_TASK_CREATION_FAILED",
			message: "Failed to create public task in database",
			contextData: { orgId, title },
		});
		return c.json({ success: false, error: "Failed to create task" }, 500);
	}

	await traceAsync(
		"task.public_create.relations",
		async () => {
			if (resolvedLabels.length > 0) {
				for (const labelId of resolvedLabels) {
					await addLabelToTask(orgId, task.id, labelId);
				}
			}

			if (resolvedAssignees.length > 0) {
				for (const userId of resolvedAssignees) {
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
				{ status: resolvedStatus, priority: resolvedPriority, title, labels: resolvedLabels, assignees: resolvedAssignees },
				session.userId,
				description || template?.description
			);
		},
		{
			description: "Adding labels, assignees, and log event for public task",
			data: { taskId: task.id, labelCount: resolvedLabels.length },
		}
	);

	const taskWithData = await traceAsync("task.public_create.refetch", () => getTaskById(orgId, task.id), {
		description: "Fetching created public task with relations",
	});

	await traceAsync(
		"task.public_create.broadcast",
		async () => {
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "CREATE_TASK" as ServerEventBaseMessage["type"],
				data: taskWithData,
			};

			sseBroadcastToRoom(orgId, "tasks", data, found?.id);
			sseBroadcastPublic(orgId, { ...data, data: data }, found?.id);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						client.channel !== "tasks" &&
						sseBroadcastIndividual(client, data, orgId)
				);
			});
		},
		{ description: "Broadcasting new public task to clients" }
	);

	return c.json({ success: true, data: taskWithData });
});

// Update task details
apiRouteAdminProjectTask.patch("/update", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, sseClientId, task_id: taskId, ...updates } = await c.req.json();
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
				with: {
					githubIssue: {},
				}
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

	// Granular task permission checks for non-creator, non-assignee members
	if (!isSystemAccount) {
		const isCreator = existingTask.createdBy === session?.userId;
		const assigneeIds = await getTaskAssigneeIds(taskId);
		const isAssignee = assigneeIds.includes(session?.userId || "");

		if (!isCreator && !isAssignee) {
			if (updates.status !== undefined) {
				const canChangeStatus = await traceOrgPermissionCheck(session?.userId || "", orgId, "tasks.changeStatus");
				if (!canChangeStatus) {
					return c.json({ success: false, error: "You don't have permission to change task status." }, 401);
				}
			}
			if (updates.priority !== undefined) {
				const canChangePriority = await traceOrgPermissionCheck(
					session?.userId || "",
					orgId,
					"tasks.changePriority",
				);
				if (!canChangePriority) {
					return c.json({ success: false, error: "You don't have permission to change task priority." }, 401);
				}
			}
			const editFields = ["title", "description", "category", "releaseId", "visible"];
			const hasEditField = editFields.some((f) => updates[f] !== undefined);
			if (hasEditField) {
				const canEditAny = await traceOrgPermissionCheck(session?.userId || "", orgId, "tasks.editAny");
				if (!canEditAny) {
					return c.json({ success: false, error: "You don't have permission to edit this task." }, 401);
				}
			}
		}
	}

	const allowed: Partial<schema.taskType> = {};
	["title", "description", "status", "priority", "category", "releaseId", "visible"].forEach((field) => {
		if (updates[field] !== undefined) {
			// @ts-expect-error dynamic field
			allowed[field] = updates[field];
		}
	});
	const userId = updates.createdBy || session?.userId;
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
				const event = await addLogEventTask(
					taskId,
					orgId,
					"status_change",
					existingTask.status,
					updates.status,
					userId
				);

				notifyAssignees({
					taskId,
					orgId,
					actorId: userId,
					type: "status_change",
					timelineEventId: event?.id,
				});

				if ((updates.status === "done" || updates.status === "in-progress") && existingTask?.githubIssue) {
					// Derive the issue number from your stored field.
					// Adjust this if your schema is different.
					const issueNumber =
						existingTask.githubIssue.issueNumber ?? existingTask.githubIssue;

					if (!issueNumber) {
						// No issue number to close; just skip quietly
						return;
					}

					const foundLink = await db.query.githubRepository.findFirst({
						where: and(
							eq(schema.githubRepository.organizationId, orgId),
							isNull(schema.githubRepository.categoryId),
							eq(schema.githubRepository.enabled, true)
						),
					});

					// No linked repo? Just skip GitHub logic, but don't break the request.
					if (!foundLink) {
						return;
					}

					try {
						const token = await getInstallationToken(foundLink.installationId);
						const octokit = new Octokit({ auth: token });

						// Resolve owner/repo from the repoId
						const { data: repoInfo } = await octokit.request(
							"GET /repositories/{repository_id}",
							{
								repository_id: foundLink.repoId,
							}
						);

						const owner = repoInfo.owner.login;
						const repo = repoInfo.name;

						await octokit.request(
							"PATCH /repos/{owner}/{repo}/issues/{issue_number}",
							{
								owner,
								repo,
								issue_number: issueNumber,
								state: updates.status === "in-progress" ? "open" : "closed",
							}
						);
					} catch (err) {
						// Don't throw; just log so it doesn't affect the main task update flow
						console.error("Failed to close GitHub issue", {
							orgId,
							taskId,
							issueNumber,
							error: err,
						});
					}
				}
			}
			if (updates.priority && updates.priority !== existingTask.priority) {
				const event = await addLogEventTask(
					taskId,
					orgId,
					"priority_change",
					existingTask.priority,
					updates.priority,
					userId
				);
				notifyAssignees({ taskId, orgId, actorId: userId, type: "priority_change", timelineEventId: event?.id });
			}
			if (updates.title && updates.title !== existingTask.title) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "title", value: existingTask.title },
					{ field: "title", value: updates.title },
					userId
				);
			}
			if (updates.description && JSON.stringify(updates.description) !== JSON.stringify(existingTask.description)) {
				const event = await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "description", value: existingTask.description },
					{ field: "description", value: updates.description },
					userId,
					updates.description
				);
				// Check for new @mentions in the updated description
				notifyMentions({ taskId, orgId, actorId: userId, content: updates.description, timelineEventId: event?.id });
			}
			if (updates.releaseId !== undefined && updates.releaseId !== existingTask.releaseId) {
				await addLogEventTask(
					taskId,
					orgId,
					"release_change",
					existingTask.releaseId,
					updates.releaseId,
					userId
				);
			}
			if (updates.visible !== undefined && updates.visible !== existingTask.visible) {
				await addLogEventTask(
					taskId,
					orgId,
					"updated",
					{ field: "visible", value: existingTask.visible },
					{ field: "visible", value: updates.visible },
					userId
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
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
				data: taskWithData,
			};

			sseBroadcastToRoom(orgId, `tasks;task:${taskId}`, data, found?.id, true);
			if (taskWithData?.visible === "public") {
				sseBroadcastPublic(orgId, { ...data }, found?.id);
			}

			// If releaseId changed, broadcast release update as well
			if (updates.releaseId !== undefined && updates.releaseId !== existingTask.releaseId) {
				const releaseData = {
					type: "UPDATE_RELEASES" as ServerEventBaseMessage["type"],
					data: { taskId, releaseId: updates.releaseId },
				};
				sseBroadcastToRoom(orgId, "releases", releaseData, found?.id);
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
				);
			});
		},
		{ description: "Broadcasting task update to clients" }
	);

	return c.json({ success: true, data: taskWithData });
});

/* -------------------------------------------------------------------------- */
/*                       Subtask / Parent Endpoints                           */
/* -------------------------------------------------------------------------- */

// Set parent task (make a task a subtask)
apiRouteAdminProjectTask.patch("/set-parent", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, sseClientId, task_id: taskId, parent_id: parentId } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		const updated = await traceAsync(
			"task.set_parent",
			() => setTaskParent(orgId, taskId, parentId),
			{ description: "Setting task parent", data: { orgId, taskId, parentId } },
		);

		// Log timeline events on both tasks
		await Promise.all([
			addLogEventTask(taskId, orgId, "parent_added", null, parentId, session?.userId),
			addLogEventTask(parentId, orgId, "subtask_added", null, taskId, session?.userId),
		]);

		// Refetch and broadcast
		const [taskWithData, parentWithData] = await Promise.all([
			getTaskById(orgId, taskId),
			getTaskById(orgId, parentId),
		]);

		const found = findClientBysseId(sseClientId);
		const taskUpdate = { type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: taskWithData };
		const parentUpdate = { type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: parentWithData };

		sseBroadcastToRoom(orgId, `tasks;task:${taskId}`, taskUpdate, found?.id, true);
		sseBroadcastToRoom(orgId, `tasks;task:${parentId}`, parentUpdate, found?.id, true);

		return c.json({ success: true, data: taskWithData });
	} catch (err) {
		await recordWideError({
			name: "task.set_parent.failed",
			error: err,
			code: "SET_PARENT_FAILED",
			message: err instanceof Error ? err.message : "Failed to set parent task",
			contextData: { orgId, taskId, parentId },
		});
		return c.json(
			{ success: false, error: err instanceof Error ? err.message : "Failed to set parent task" },
			400,
		);
	}
});

// Remove parent task (promote subtask to top-level)
apiRouteAdminProjectTask.patch("/remove-parent", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const { org_id: orgId, sseClientId, task_id: taskId } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		// Get existing parent before removal
		const existingTask = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, taskId), eq(t.organizationId, orgId)),
			columns: { parentId: true },
		});

		const oldParentId = existingTask?.parentId;

		const updated = await traceAsync(
			"task.remove_parent",
			() => removeTaskParent(orgId, taskId),
			{ description: "Removing task parent", data: { orgId, taskId } },
		);

		// Log timeline events
		const timelinePromises = [
			addLogEventTask(taskId, orgId, "parent_removed", oldParentId, null, session?.userId),
		];
		if (oldParentId) {
			timelinePromises.push(
				addLogEventTask(oldParentId, orgId, "subtask_removed", taskId, null, session?.userId),
			);
		}
		await Promise.all(timelinePromises);

		// Refetch and broadcast
		const taskWithData = await getTaskById(orgId, taskId);
		const found = findClientBysseId(sseClientId);
		const taskUpdate = { type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: taskWithData };
		sseBroadcastToRoom(orgId, `tasks;task:${taskId}`, taskUpdate, found?.id, true);

		if (oldParentId) {
			const parentWithData = await getTaskById(orgId, oldParentId);
			const parentUpdate = { type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: parentWithData };
			sseBroadcastToRoom(orgId, `tasks;task:${oldParentId}`, parentUpdate, found?.id, true);
		}

		return c.json({ success: true, data: taskWithData });
	} catch (err) {
		await recordWideError({
			name: "task.remove_parent.failed",
			error: err,
			code: "REMOVE_PARENT_FAILED",
			message: "Failed to remove parent task",
			contextData: { orgId, taskId },
		});
		return c.json({ success: false, error: "Failed to remove parent task" }, 400);
	}
});

// Get subtasks for a task
apiRouteAdminProjectTask.get("/subtasks", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const orgId = c.req.query("org_id");
	const taskId = c.req.query("task_id");
	const session = c.get("session");

	if (!orgId || !taskId) {
		return c.json({ success: false, error: "Missing org_id or task_id" }, 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		const subtasks = await traceAsync(
			"task.get_subtasks",
			() => getSubtasks(orgId, taskId),
			{ description: "Fetching subtasks", data: { orgId, taskId } },
		);

		return c.json({ success: true, data: subtasks });
	} catch (err) {
		await recordWideError({
			name: "task.get_subtasks.failed",
			error: err,
			code: "GET_SUBTASKS_FAILED",
			message: "Failed to fetch subtasks",
			contextData: { orgId, taskId },
		});
		return c.json({ success: false, error: "Failed to fetch subtasks" }, 500);
	}
});

/* -------------------------------------------------------------------------- */
/*                         Task Relation Endpoints                            */
/* -------------------------------------------------------------------------- */

// Create a relation between two tasks
apiRouteAdminProjectTask.post("/create-relation", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		sseClientId,
		source_task_id: sourceTaskId,
		target_task_id: targetTaskId,
		type,
	} = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		const relation = await traceAsync(
			"task.create_relation",
			() => createTaskRelation(orgId, sourceTaskId, targetTaskId, type, session?.userId),
			{ description: "Creating task relation", data: { orgId, sourceTaskId, targetTaskId, type } },
		);

		// Log timeline events on both tasks
		const relationInfo = { type, relatedTaskId: targetTaskId };
		const reverseInfo = { type, relatedTaskId: sourceTaskId };
		await Promise.all([
			addLogEventTask(sourceTaskId, orgId, "relation_added", null, relationInfo, session?.userId),
			addLogEventTask(targetTaskId, orgId, "relation_added", null, reverseInfo, session?.userId),
		]);

		// Refetch and broadcast both tasks
		const [sourceWithData, targetWithData] = await Promise.all([
			getTaskById(orgId, sourceTaskId),
			getTaskById(orgId, targetTaskId),
		]);

		const found = findClientBysseId(sseClientId);
		sseBroadcastToRoom(
			orgId,
			`tasks;task:${sourceTaskId}`,
			{ type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: sourceWithData },
			found?.id,
			true,
		);
		sseBroadcastToRoom(
			orgId,
			`tasks;task:${targetTaskId}`,
			{ type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: targetWithData },
			found?.id,
			true,
		);

		return c.json({ success: true, data: sourceWithData });
	} catch (err) {
		await recordWideError({
			name: "task.create_relation.failed",
			error: err,
			code: "CREATE_RELATION_FAILED",
			message: err instanceof Error ? err.message : "Failed to create relation",
			contextData: { orgId, sourceTaskId, targetTaskId, type },
		});
		return c.json(
			{ success: false, error: err instanceof Error ? err.message : "Failed to create relation" },
			400,
		);
	}
});

// Remove a task relation
apiRouteAdminProjectTask.delete("/remove-relation", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const {
		org_id: orgId,
		sseClientId,
		relation_id: relationId,
		source_task_id: sourceTaskId,
		target_task_id: targetTaskId,
	} = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		await traceAsync(
			"task.remove_relation",
			() => removeTaskRelation(orgId, relationId),
			{ description: "Removing task relation", data: { orgId, relationId } },
		);

		// Log timeline events on both tasks if IDs were provided
		if (sourceTaskId && targetTaskId) {
			await Promise.all([
				addLogEventTask(sourceTaskId, orgId, "relation_removed", relationId, null, session?.userId),
				addLogEventTask(targetTaskId, orgId, "relation_removed", relationId, null, session?.userId),
			]);
		}

		// Broadcast updates for both tasks
		const found = findClientBysseId(sseClientId);
		let sourceWithData = null;
		if (sourceTaskId) {
			sourceWithData = await getTaskById(orgId, sourceTaskId);
			sseBroadcastToRoom(
				orgId,
				`tasks;task:${sourceTaskId}`,
				{ type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: sourceWithData },
				found?.id,
				true,
			);
		}
		if (targetTaskId) {
			const targetWithData = await getTaskById(orgId, targetTaskId);
			sseBroadcastToRoom(
				orgId,
				`tasks;task:${targetTaskId}`,
				{ type: "UPDATE_TASK" as ServerEventBaseMessage["type"], data: targetWithData },
				found?.id,
				true,
			);
		}

		return c.json({ success: true, data: sourceWithData });
	} catch (err) {
		await recordWideError({
			name: "task.remove_relation.failed",
			error: err,
			code: "REMOVE_RELATION_FAILED",
			message: "Failed to remove relation",
			contextData: { orgId, relationId },
		});
		return c.json({ success: false, error: "Failed to remove relation" }, 400);
	}
});

// Get relations for a task
apiRouteAdminProjectTask.get("/relations", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const orgId = c.req.query("org_id");
	const taskId = c.req.query("task_id");
	const session = c.get("session");

	if (!orgId || !taskId) {
		return c.json({ success: false, error: "Missing org_id or task_id" }, 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	try {
		const relations = await traceAsync(
			"task.get_relations",
			() => getTaskRelations(orgId, taskId),
			{ description: "Fetching task relations", data: { orgId, taskId } },
		);

		return c.json({ success: true, data: relations });
	} catch (err) {
		await recordWideError({
			name: "task.get_relations.failed",
			error: err,
			code: "GET_RELATIONS_FAILED",
			message: "Failed to fetch task relations",
			contextData: { orgId, taskId },
		});
		return c.json({ success: false, error: "Failed to fetch task relations" }, 500);
	}
});

// --- Search tasks within an organization (for TaskPicker) ---
apiRouteAdminProjectTask.get("/search", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const orgId = c.req.query("org_id");
	const query = c.req.query("q") || "";
	const limitParam = c.req.query("limit");
	const offsetParam = c.req.query("offset");
	const session = c.get("session");

	if (!orgId) {
		return c.json(errorResponse("Missing organization id", "Query parameter `org_id` is required"), 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	const limit = Math.min(Math.max(Number.parseInt(limitParam || "20", 10) || 20, 1), 50);
	const offset = Math.max(Number.parseInt(offsetParam || "0", 10) || 0, 0);

	try {
		const results = await traceAsync(
			"task.search_org",
			() => searchTasksByOrganization(orgId, query || undefined, limit, offset),
			{
				description: "Searching tasks within organization",
				data: { orgId, query, limit, offset },
				onSuccess: (result) => ({
					description: "Org task search completed",
					data: { resultCount: result.length },
				}),
			},
		);

		return c.json({ success: true, data: results });
	} catch (err) {
		await recordWideError({
			name: "task.search_org.failed",
			error: err,
			code: "TASK_SEARCH_FAILED",
			message: "Failed to search tasks in organization",
			contextData: { orgId, query },
		});
		return c.json({ success: false, error: "Failed to search tasks" }, 500);
	}
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
				where: (r) => and(eq(r.organizationId, orgId), eq(r.repoId, repoId), eq(r.enabled, true)),
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
				type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
				data: taskWithData,
			};

			sseBroadcastToRoom(orgId, `tasks;task:${taskId}`, data, undefined, true);
			if (taskWithData?.visible === "public") {
				sseBroadcastPublic(orgId, { ...data });
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
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
		createdBy,
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
				createdBy || undefined
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
				type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
				data: taskWithData,
			};

			sseBroadcastToRoom(
				orgId,
				`tasks;task:${taskId}`,
				message,
				undefined,
				true
			);

			if (taskWithData?.visible === "public") {
				sseBroadcastPublic(orgId, { ...message });
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						!(
							client.channel === `task:${taskId}` ||
							client.channel === "tasks"
						) &&
						sseBroadcastIndividual(
							client,
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

	const { org_id: orgId, sseClientId, task_id: taskId, labels } = await c.req.json();
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
				const found = findClientBysseId(sseClientId);
				const data = {
					type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
					data: taskWithData,
				};

				sseBroadcastToRoom(orgId, `tasks;task:${taskId}`, data, found?.id, true);
				if (taskWithData?.visible === "public") {
					sseBroadcastPublic(orgId, { ...data }, found?.id);
				}

				const members = await getOrganizationMembers(orgId);
				members.forEach((member) => {
					const clients = findSSEClientsByUserId(member.userId);
					clients.forEach(
						(client) =>
							client.id !== sseClientId &&
							!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
							sseBroadcastIndividual(client, data, orgId)
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

	const { org_id: orgId, sseClientId, task_id: taskId, assignees } = await c.req.json();
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
						const event = await addLogEventTask(taskId, orgId, "assignee_added", null, userId, session?.userId);
						// Notify the newly assigned user
						createNotification({
							organizationId: orgId,
							userId,
							actorId: session?.userId,
							taskId,
							timelineEventId: event?.id,
							type: "assignee_added",
						}).then((notif) => {
							if (notif && notif.userId !== session?.userId) {
								sseBroadcastByUserId(notif.userId, "", orgId, {
									type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
									data: notif,
									meta: { ts: Date.now() },
								});
							}
						}).catch(() => { });
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
						const event = await addLogEventTask(taskId, orgId, "assignee_removed", null, userId, session?.userId);
						// Notify the removed user
						createNotification({
							organizationId: orgId,
							userId,
							actorId: session?.userId,
							taskId,
							timelineEventId: event?.id,
							type: "assignee_removed",
						}).then((notif) => {
							if (notif && notif.userId !== session?.userId) {
								sseBroadcastByUserId(notif.userId, "", orgId, {
									type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
									data: notif,
									meta: { ts: Date.now() },
								});
							}
						}).catch(() => { });
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
				const found = findClientBysseId(sseClientId);
				const data = {
					type: "UPDATE_TASK" as ServerEventBaseMessage["type"],
					data: taskWithData,
				};

				sseBroadcastToRoom(orgId, `tasks;task:${taskId}`, data, found?.id, true);
				if (taskWithData?.visible === "public") {
					sseBroadcastPublic(orgId, { ...data }, found?.id);
				}

				const members = await getOrganizationMembers(orgId);
				members.forEach((member) => {
					const clients = findSSEClientsByUserId(member.userId);
					clients.forEach(
						(client) =>
							client.id !== sseClientId &&
							!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
							sseBroadcastIndividual(client, data, orgId)
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

	const { org_id: orgId, sseClientId, task_id: taskId, content, visibility, source, externalAuthorLogin, externalAuthorUrl, externalIssueNumber, externalCommentId, externalCommentUrl, createdBy: bodyCreatedBy, parentId } = await c.req.json();
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

		const isPublicAccess = await tracePublicOrgAccessCheck(orgId);
		if (!isPublicAccess) {
			return c.json(
				{
					success: false,
					error: "You don't have permission to comment on this task.",
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
	// Determine the actor attempting to create the comment
	const commentActorIdCheck =
		source === "github"
			? bodyCreatedBy
			: bodyCreatedBy ?? session?.userId;

	// Blocked users cannot post at all
	if (commentActorIdCheck) {
		const blockedIds = await getBlockedUserIds(orgId);
		if (blockedIds.includes(commentActorIdCheck)) {
			return c.json(
				{
					success: false,
					error: "You do not have permission to perform this action.",
				},
				403
			);
		}
	}

	// Validate parentId if provided: must be a top-level comment in the same task
	let resolvedVisibility = visibility;
	if (parentId) {
		const parentComment = await db.query.taskComment.findFirst({
			where: (t) => and(eq(t.id, parentId), eq(t.organizationId, orgId), eq(t.taskId, taskId)),
			columns: { id: true, parentId: true, visibility: true },
		});
		if (!parentComment) {
			return c.json({ success: false, error: "Parent comment not found." }, 404);
		}
		if (parentComment.parentId !== null) {
			return c.json({ success: false, error: "Cannot reply to a reply. Only top-level comments can have replies." }, 400);
		}
		// Replies inherit parent visibility
		resolvedVisibility = parentComment.visibility;
	}

	await traceAsync(
		"task.comment.create.insert",
		() => {
			// For GitHub-sourced comments, only set createdBy if explicitly provided (linked Sayr user).
			// Otherwise leave it null so unlinked GitHub users show their GitHub identity, not the system account.
			const effectiveCreatedBy = source === "github" ? bodyCreatedBy : (bodyCreatedBy ?? session?.userId);
			return createComment(orgId, taskId, content, resolvedVisibility, effectiveCreatedBy, source, externalAuthorLogin, externalAuthorUrl, externalIssueNumber, externalCommentId, externalCommentUrl, parentId ?? null);
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

	// Notify assignees and mentioned users about the new comment.
	// Users who are both assigned AND mentioned only receive one notification (the "comment" type).
	const commentActorId = source === "github" ? bodyCreatedBy : (bodyCreatedBy ?? session?.userId);
	const assigneeIds = await getTaskAssigneeIds(taskId);
	const mentionedUserIds = extractUserMentions(content);

	// Send "comment" notifications to all assignees (filtered by actor inside createNotifications)
	notifyAssignees({ taskId, orgId, actorId: commentActorId, type: "comment" });

	// Send "mention" notifications only to mentioned users who are NOT assignees.
	// Assignees already receive a "comment" notification above, so skip them to avoid duplicates.
	const assigneeSet = new Set(assigneeIds);
	const mentionOnlyUserIds = [...new Set(mentionedUserIds)].filter((id) => !assigneeSet.has(id));
	if (mentionOnlyUserIds.length > 0) {
		for (const userId of mentionOnlyUserIds) {
			try {
				const notif = await createNotification({
					organizationId: orgId,
					userId,
					actorId: commentActorId ?? null,
					taskId,
					timelineEventId: null,
					type: "mention",
				});
				if (notif) {
					sseBroadcastByUserId(notif.userId, "", orgId, {
						type: "NEW_NOTIFICATION" as ServerEventBaseMessage["type"],
						data: notif,
						meta: { ts: Date.now() },
					});
				}
			} catch {
				// Notification failures should never break task operations
			}
		}
	}

	// Fire timeline events on any tasks mentioned in the comment.
	// Each mentioned task gets a "task_mentioned" event pointing back to this task.
	const mentionedTaskIds = extractTaskMentions(content);
	if (mentionedTaskIds.length > 0) {
		await Promise.all(
			mentionedTaskIds
				.filter((id) => id !== taskId) // skip self-mentions
				.map((mentionedTaskId) =>
					addLogEventTask(mentionedTaskId, orgId, "task_mentioned", null, { sourceTaskId: taskId }, commentActorId ?? undefined).catch(
						() => { } // never let timeline failures break comment creation
					)
				)
		);
	}

	await traceAsync(
		"task.comment.create.broadcast",
		async () => {
			const seeFound = findClientBysseId(sseClientId)
			const data = {
				type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"],
				data: { id: taskId },
			};
			sseBroadcastToRoom(orgId, `task:${taskId}`, data, seeFound?.id)
			if (visibility === "public") {
				sseBroadcastPublic(orgId, { ...data }, seeFound?.id);
			}

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
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

	const { org_id: orgId, sseClientId, comment_id: commentId, content, visibility } = await c.req.json();
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
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"],
				data: { id: comment.taskId },
			};

			sseBroadcastToRoom(orgId, `task:${comment.taskId}`, data, found?.id, false);
			sseBroadcastPublic(orgId, { ...data }, found?.id);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${comment.taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
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

	const { org_id: orgId, task_id: taskId, comment_id: commentId, sseClientId } = await c.req.json();
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
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"],
				data: { id: taskId },
			};

			sseBroadcastToRoom(orgId, `task:${taskId}`, data, found?.id, false);
			sseBroadcastPublic(orgId, { ...data }, found?.id);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
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

	const { org_id: orgId, task_id: taskId, comment_id: commentId, visibility, sseClientId } = await c.req.json();
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
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"],
				data: { id: taskId },
			};

			sseBroadcastToRoom(orgId, `task:${taskId}`, data, found?.id, false);
			sseBroadcastPublic(orgId, { ...data }, found?.id);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
				);
			});
		},
		{ description: "Broadcasting comment visibility update to clients" }
	);

	return c.json({ success: true, data: { id: commentId, visibility } });
});

apiRouteAdminProjectTask.post("/create-reaction", async (c) => {
	const traceAsync = createTraceAsync();

	const { orgId, taskId, sseClientId, comment_id: commentId, emoji } = await c.req.json();

	const session = c.get("session");

	// 1️⃣ Permission check — org members get full access; non-members must be signed in + task must be public
	const isOrgMember = await traceOrgPermissionCheck(session?.userId || "", orgId, "members");

	if (!isOrgMember) {
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
	if (session?.userId) {
		const blockedIds = await getBlockedUserIds(orgId);
		if (blockedIds.includes(session?.userId || "")) {
			return c.json(
				{
					success: false,
					error: "You do not have permission to perform this action.",
				},
				403
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
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"],
				data: { id: taskId },
			};

			sseBroadcastToRoom(orgId, `task:${taskId}`, data, found?.id, false);
			sseBroadcastPublic(orgId, { ...data }, found?.id);

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
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

		// Fetch blocked user IDs for public viewers so their comments are excluded server-side
		const blockedIds = isPublic ? await getBlockedUserIds(orgId) : [];

		const page = Math.max(Number(q.page) || 1, 1);
		const limit = Math.min(Number(q.limit) || 20, 50);
		const offset = (page - 1) * limit;

		const base = and(
			eq(schema.taskComment.organizationId, orgId),
			eq(schema.taskComment.taskId, taskId),
			isNull(schema.taskComment.parentId),
			isPublic ? eq(schema.taskComment.visibility, "public") : undefined,
			blockedIds.length > 0 ? notInArray(schema.taskComment.createdBy, blockedIds) : undefined,
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

		// Enrich top-level comments with reply counts and latest reply author
		const commentIds = comments.map((c) => c.id);
		const replyData = commentIds.length > 0 ? await getCommentReplyCountBatch(orgId, commentIds) : new Map();
		const enrichedComments = comments.map((comment) => {
			const data = replyData.get(comment.id);
			return {
				...comment,
				replyCount: data?.replyCount ?? 0,
				latestReplyAuthor: data?.latestReplyAuthor ?? null,
				replyAuthors: data?.replyAuthors ?? [],
			};
		});

		return c.json({
			success: true,
			data: enrichedComments,
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

	const session = c.get("session");
	const isPublic = !session || !(await traceOrgPermissionCheck(session.userId, orgId, "members"));
	const blockedIds = isPublic ? await getBlockedUserIds(orgId) : [];

	const perPage = Math.min(Number(limit) || 9, 50);

	const { totalItems, totalPages } = await traceAsync(
		"task.comments.count",
		async () => {
			const conditions = and(
				eq(schema.taskComment.organizationId, orgId),
				eq(schema.taskComment.taskId, taskId),
				isNull(schema.taskComment.parentId),
				isPublic ? eq(schema.taskComment.visibility, "public") : undefined,
				blockedIds.length > 0 ? notInArray(schema.taskComment.createdBy, blockedIds) : undefined,
			);
			const [result] = await db.select({ count: sql<number>`count(*)` }).from(schema.taskComment).where(conditions);
			const total = Number(result?.count ?? 0);
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

apiRouteAdminProjectTask.get("/timeline/comments/replies", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	try {
		const q = c.req.query();
		const orgId = q.org_id;
		const commentId = q.comment_id;

		if (!orgId || !commentId) {
			return c.json({ success: false, error: "org_id and comment_id are required" }, 400);
		}

		const session = c.get("session");
		const isPublic = !session || !(await traceOrgPermissionCheck(session.userId, orgId, "members"));

		const page = Math.max(Number(q.page) || 1, 1);
		const limit = Math.min(Number(q.limit) || 50, 100);
		const offset = (page - 1) * limit;

		const blockedIds = isPublic ? await getBlockedUserIds(orgId) : [];

		const replies = await traceAsync(
			"task.comments.replies.fetch",
			async () => {
				const base = and(
					eq(schema.taskComment.organizationId, orgId),
					eq(schema.taskComment.parentId, commentId),
					isPublic ? eq(schema.taskComment.visibility, "public") : undefined,
					blockedIds.length > 0 ? notInArray(schema.taskComment.createdBy, blockedIds) : undefined,
				);

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

				// Aggregate reactions (same pattern as parent comments)
				return rows.map((comment) => {
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
						reactions: { total, reactions: grouped },
						eventType: "comment" as const,
						actor: comment.createdBy,
					};
				});
			},
			{
				description: "Fetching comment replies",
				data: { orgId, commentId, page, limit, isPublic },
			}
		);

		return c.json({
			success: true,
			data: replies,
		});
	} catch (err) {
		await recordWideError({
			name: "task.timeline.comments.replies.error",
			error: err,
			message: "Failed to fetch comment replies",
			contextData: { path: c.req.path, query: c.req.query() },
		});
		return c.json({ success: false, message: (err as Error)?.message }, 500);
	}
});

apiRouteAdminProjectTask.post("/create-vote", async (c) => {
	const traceAsync = createTraceAsync();

	const { orgId, taskId, sseClientId } = await c.req.json();
	const session = c.get("session");

	// 2️⃣ Anonymous fingerprint (NO IP STORED)
	const ip = getClientIP(c.req.raw);
	const userAgent = c.req.header("user-agent") ?? "unknown";
	const anonHash = getAnonHash(ip, userAgent);
	const userId = session?.userId ?? null;
	if (userId) {
		const blockedIds = await getBlockedUserIds(orgId);
		if (blockedIds.includes(userId)) {
			return c.json(
				{
					success: false,
					error: "You do not have permission to perform this action.",
				},
				403
			);
		}
	}
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
			const found = findClientBysseId(sseClientId);
			const data = {
				type: "UPDATE_TASK_VOTE" as ServerEventBaseMessage["type"],
				data: {
					id: taskId,
					voteCount: updatedTask?.voteCount ?? 0,
				},
			};

			sseBroadcastToRoom(orgId, `task:${taskId}`, data, found?.id, false);
			sseBroadcastPublic(orgId, { ...data });

			const members = await getOrganizationMembers(orgId);
			members.forEach((member) => {
				const clients = findSSEClientsByUserId(member.userId);
				clients.forEach(
					(client) =>
						client.id !== sseClientId &&
						client.orgId !== orgId &&
						!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
						sseBroadcastIndividual(client, data, orgId)
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
