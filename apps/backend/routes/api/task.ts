import { Octokit } from "@octokit/rest";
import {
	addLabelToTask,
	addLogEventTask,
	createComment,
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

export const apiRouteAdminProjectTask = new Hono<AppEnv>();

// Create a new task
apiRouteAdminProjectTask.post("/create", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Create task requested";
	const { org_id, wsClientId, title, description, status, priority, labels, assignees, category } = await c.req.json();
	const session = c.get("session");
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");

	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to create tasks",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	const task = await createTask(
		org_id,
		{
			title,
			description,
			status,
			priority,
			category,
		},
		session?.userId
	);

	if (!task) {
		wideEvent.error = {
			type: "DatabaseError",
			code: "TaskCreationFailed",
			message: "Failed to create task in database",
		};
		return c.json({ success: false, path: c.req.path, error: "Failed to create task" }, 500);
	}
	if (labels && labels.length > 0) {
		for (const labelId of labels) {
			await addLabelToTask(org_id, task.id, labelId);
		}
	}
	// Attach assignees if provided
	if (assignees?.length > 0) {
		for (const userId of assignees) {
			await db
				.insert(schema.taskAssignee)
				.values({
					taskId: task.id,
					organizationId: org_id,
					userId,
				})
				.onConflictDoNothing(); // avoid duplicate assignments
		}
	}
	await addLogEventTask(
		task.id,
		org_id,
		"created",
		null,
		{ status, priority, title, labels, assignees },
		session?.userId,
		description
	);
	// Refetch with full labels
	const taskWithData = await getTaskById(org_id, task.id);

	const found = findClientByWsId(wsClientId);
	const data = {
		type: "CREATE_TASK" as WSBaseMessage["type"],
		data: taskWithData,
	};
	broadcast(org_id, `tasks`, data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		const clients = findClientsByUserId(member.userId);
		clients.forEach(
			(c) => c.wsClientId !== wsClientId && c.channel !== "tasks" && broadcastIndividual(c.socket, data, org_id)
		);
	});
	const foundLink = await db.query.githubRepository.findFirst({
		where: and(eq(schema.githubRepository.organizationId, org_id), eq(schema.githubRepository.categoryId, category)),
	});
	if (foundLink) {
		// 1️⃣ Get installation token
		const token = await getInstallationToken(foundLink.installationId);
		const octokit = new Octokit({ auth: token });

		// 2️⃣ Fetch repository metadata by repo_id
		const { data: repoInfo } = await octokit.request("GET /repositories/{repository_id}", {
			repository_id: foundLink.repoId,
		});

		const owner = repoInfo.owner.login;
		const repo = repoInfo.name;

		const { data: issue } = await octokit.request("POST /repos/{owner}/{repo}/issues", {
			owner,
			repo,
			title,
		});
		if (taskWithData) {
			await db.insert(schema.githubIssue).values({
				repositoryId: foundLink.id,
				issueNumber: issue.number,
				issueUrl: issue.html_url,
				taskId: taskWithData.id,
				organizationId: org_id,
			});
		}
	}
	wideEvent.taskCreation = {
		organizationId: org_id,
		createdByUserId: session?.userId || "",
		taskId: task.id,
		title: title,
	};
	return c.json({
		success: true,
		data: taskWithData,
	});
});
// Update task details
apiRouteAdminProjectTask.patch("/update", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Update task requested";
	const { org_id, wsClientId, task_id, ...updates } = await c.req.json();
	const session = c.get("session");
	const systemAccountCheck = session?.userId === process.env.SYSTEM_ACCOUNT_ID;
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (systemAccountCheck) {
		wideEvent.systemAccountUpdate = true;
		console.log("✅ System account authorized to update task", {
			task_id,
			org_id,
			updates,
			userId: session?.userId,
			userAgent: c.req.header("user-agent"),
			service: c.req.header("x-internal-service"),
		});
	}
	if (!isAuthorized && !systemAccountCheck) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to update tasks",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	// 🔎 Check task existence
	const existingTask = await db.query.task.findFirst({
		where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id)),
	});
	if (!existingTask) {
		wideEvent.error = {
			type: "NotFoundError",
			code: "TaskNotFound",
			message: "Task not found in database",
		};
		return c.json({ success: false, error: "Task not found" }, 404);
	}

	// 🎯 Pick only fields allowed for update
	const allowed: Partial<schema.taskType> = {};
	["title", "description", "status", "priority", "category"].forEach((field) => {
		if (updates[field] !== undefined) {
			// @ts-expect-error because dynamic field assignment
			allowed[field] = updates[field];
		}
	});

	if (Object.keys(allowed).length > 0) {
		await db
			.update(schema.task)
			.set({ ...allowed, updatedAt: new Date() })
			.where(and(eq(schema.task.id, task_id), eq(schema.task.organizationId, org_id)))
			.returning();
	}

	// 📝 Step 2: Log timeline changes
	if (updates.category && updates.category !== existingTask.category) {
		await addLogEventTask(
			task_id,
			org_id,
			"category_change",
			existingTask.category,
			updates.category,
			session?.userId
		);
	}
	if (updates.status && updates.status !== existingTask.status) {
		await addLogEventTask(task_id, org_id, "status_change", existingTask.status, updates.status, session?.userId);
	}
	if (updates.priority && updates.priority !== existingTask.priority) {
		await addLogEventTask(
			task_id,
			org_id,
			"priority_change",
			existingTask.priority,
			updates.priority,
			session?.userId
		);
	}
	if (updates.title && updates.title !== existingTask.title) {
		await addLogEventTask(task_id, org_id, "updated", existingTask.title, updates.title, session?.userId);
	}
	if (updates.description && JSON.stringify(updates.description) !== JSON.stringify(existingTask.description)) {
		await addLogEventTask(
			task_id,
			org_id,
			"updated",
			existingTask.description,
			updates.description,
			session?.userId,
			updates.description
		);
	}

	// 🔄 Step 3: Refetch task with relations
	const taskWithData = await getTaskById(org_id, task_id);

	// 📢 Step 4: Broadcast one unified update
	const found = findClientByWsId(wsClientId);
	const data = { type: "UPDATE_TASK" as WSBaseMessage["type"], data: taskWithData };
	broadcastToRoom(org_id, `tasks;task:${task_id}`, data, found?.socket, true);
	broadcastPublic(org_id, { ...data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		const clients = findClientsByUserId(member.userId);
		clients.forEach(
			(c) =>
				c.wsClientId !== wsClientId &&
				!(c.channel === `task:${task_id}` || c.channel === "tasks") &&
				broadcastIndividual(c.socket, data, org_id)
		);
	});
	wideEvent.taskUpdate = {
		organizationId: org_id,
		updatedByUserId: session?.userId || "",
		taskId: task_id,
		updates: allowed,
	};
	return c.json({ success: true, data: taskWithData });
});
// Update task labels
apiRouteAdminProjectTask.post("/update-labels", async (c) => {
	const wideEvent = c.get("wideEvent");
	const { org_id, wsClientId, task_id, labels } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to update task labels",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	// const key = `${org_id}:${project_id}:${task_id}`;

	try {
		// const taskWithData = await enqueueJob(key, async () => {
		// 🔎 Check task existence with labels
		const existingTask = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id)),
			with: {
				labels: { with: { label: true } },
			},
		});

		if (!existingTask) {
			wideEvent.error = {
				type: "NotFoundError",
				code: "TaskNotFound",
				message: "Task not found in database",
			};
			return c.json({ success: false, error: "Task not found" }, 404);
		}

		// Normalize labels for the task
		const Task = {
			...existingTask,
			labels: existingTask?.labels.map((l) => l.label),
		};

		const currentLabelIds = Task.labels?.map((l) => l.id) || [];
		const incomingLabelIds = labels || [];

		// 1️⃣ Add missing labels
		for (const labelId of incomingLabelIds) {
			if (!currentLabelIds.includes(labelId)) {
				await addLabelToTask(org_id, task_id, labelId);
				await addLogEventTask(task_id, org_id, "label_added", null, labelId, session?.userId);
			}
		}

		// 2️⃣ Remove labels not in incoming list
		for (const labelId of currentLabelIds) {
			if (!incomingLabelIds.includes(labelId)) {
				await removeLabelFromTask(org_id, task_id, labelId);
				await addLogEventTask(task_id, org_id, "label_removed", null, labelId, session?.userId);
			}
		}

		const taskWithData = await getTaskById(org_id, task_id);
		// });

		// // undefined means this wasn’t the latest — skip returning older state
		// if (taskWithData === undefined) {
		// 	return c.json({ success: true, skipped: true }, 202);
		// }

		const found = findClientByWsId(wsClientId);
		const data = { type: "UPDATE_TASK" as WSBaseMessage["type"], data: taskWithData };
		broadcastToRoom(org_id, `tasks;task:${task_id}`, data, found?.socket, true);
		broadcastPublic(org_id, { ...data });
		const members = await getOrganizationMembers(org_id);
		members.forEach((member) => {
			const clients = findClientsByUserId(member.userId);
			clients.forEach(
				(c) =>
					c.wsClientId !== wsClientId &&
					!(c.channel === `task:${task_id}` || c.channel === "tasks") &&
					broadcastIndividual(c.socket, data, org_id)
			);
		});
		wideEvent.taskLabelUpdate = {
			organizationId: org_id,
			updatedByUserId: session?.userId || "",
			taskId: task_id,
			newLabels: labels,
		};
		return c.json({ success: true, data: taskWithData });
	} catch (err) {
		console.error("update-labels error:", err);
		const errorMessage =
			typeof err === "object" && err !== null && "message" in err
				? String((err as { message?: unknown }).message)
				: String(err);
		return c.json({ success: false, error: errorMessage }, 500);
	}
});
// Update task assignees
apiRouteAdminProjectTask.post("/update-assignees", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Update task assignees requested";
	const { org_id, wsClientId, task_id, assignees } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to update task assignees",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	// const key = `${org_id}:${project_id}:${task_id}`;
	try {
		// const taskWithData = await enqueueJob(key, async () => {
		// 🔎 Check task existence with labels
		const existingTask = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id)),
			with: {
				assignees: {
					with: { user: { columns: { id: true, name: true, image: true } } },
				},
			},
		});

		if (!existingTask) {
			wideEvent.error = {
				type: "NotFoundError",
				code: "TaskNotFound",
				message: "Task not found in database",
			};
			return c.json({ success: false, error: "Task not found" }, 404);
		}
		// Normalize assignees for the task
		const Task = {
			...existingTask,
			assignees: existingTask.assignees.map((a) => a.user),
		};
		const currentAssigneeIds = Task.assignees?.map((a) => a.id) || [];
		const incomingAssigneeIds = assignees || [];
		// 1️⃣ Add missing assignees
		for (const userId of incomingAssigneeIds) {
			if (!currentAssigneeIds.includes(userId)) {
				await db
					.insert(schema.taskAssignee)
					.values({ taskId: task_id, organizationId: org_id, userId })
					.onConflictDoNothing();
				await addLogEventTask(task_id, org_id, "assignee_added", null, userId, session?.userId);
			}
		}
		// 2️⃣ Remove assignees not in incoming list
		for (const userId of currentAssigneeIds) {
			if (!incomingAssigneeIds.includes(userId)) {
				await db
					.delete(schema.taskAssignee)
					.where(
						and(
							eq(schema.taskAssignee.taskId, task_id),
							eq(schema.taskAssignee.organizationId, org_id),
							eq(schema.taskAssignee.userId, userId)
						)
					);
				await addLogEventTask(task_id, org_id, "assignee_removed", null, userId, session?.userId);
			}
		}

		// 🔄 Fetch updated task with related data
		const taskWithData = await getTaskById(org_id, task_id);
		// return taskWithData;
		// });

		// undefined means this wasn’t the latest — skip returning older state
		// if (taskWithData === undefined) {
		// 	return c.json({ success: true, skipped: true }, 202);
		// }

		const found = findClientByWsId(wsClientId);
		const data = { type: "UPDATE_TASK" as WSBaseMessage["type"], data: taskWithData };
		broadcastToRoom(org_id, `tasks;task:${task_id}`, data, found?.socket, true);
		broadcastPublic(org_id, { ...data });
		const members = await getOrganizationMembers(org_id);
		members.forEach((member) => {
			const clients = findClientsByUserId(member.userId);
			clients.forEach(
				(c) =>
					c.wsClientId !== wsClientId &&
					!(c.channel === `task:${task_id}` || c.channel === "tasks") &&
					broadcastIndividual(c.socket, data, org_id)
			);
		});
		wideEvent.taskUpdate = {
			organizationId: org_id,
			updatedByUserId: session?.userId || "",
			taskId: task_id,
			newAssignees: assignees,
		};
		return c.json({ success: true, data: taskWithData });
	} catch (err) {
		console.error("update-assignees error:", err);
		const errorMessage =
			typeof err === "object" && err !== null && "message" in err
				? String((err as { message?: unknown }).message)
				: String(err);
		return c.json({ success: false, error: errorMessage }, 500);
	}
});
// Create a comment on a task
apiRouteAdminProjectTask.post("/create-comment", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Create task comment requested";
	const { org_id, wsClientId, task_id, content, visibility } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to create task comments",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}
	await createComment(org_id, task_id, content, visibility, session?.userId);
	const found = findClientByWsId(wsClientId);
	const data = { type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"], data: { id: task_id } };
	broadcastToRoom(org_id, `task:${task_id}`, data, found?.socket, false);
	broadcastPublic(org_id, { ...data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		const clients = findClientsByUserId(member.userId);
		clients.forEach(
			(c) =>
				c.wsClientId !== wsClientId &&
				c.orgId !== org_id &&
				!(c.channel === `task:${task_id}` || c.channel === "tasks") &&
				broadcastIndividual(c.socket, data, org_id)
		);
	});
	wideEvent.taskCommentCreation = {
		organizationId: org_id,
		createdByUserId: session?.userId || "",
		taskId: task_id,
		visibility: visibility,
	};
	return c.json({ success: true, data: { id: task_id } });
});

// Edit a comment on a task
apiRouteAdminProjectTask.put("/edit-comment", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Edit task comment requested";
	const { org_id, wsClientId, comment_id, content, visibility } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to edit task comments",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}

	const comment = await db.query.taskComment.findFirst({
		where: (t) => eq(t.id, comment_id as string),
	});

	if (!comment) {
		wideEvent.error = {
			type: "NotFoundError",
			code: "COMMENT_NOT_FOUND",
			message: "Comment not found in database",
		};
		return c.json({ success: false, error: "COMMENT_NOT_FOUND" }, 404);
	}

	// Update comment and record the new state in history
	await db.transaction(async (tx) => {
		await tx
			.update(schema.taskComment)
			.set({
				content,
				visibility: visibility ?? comment.visibility,
				updatedAt: new Date(),
			})
			.where(eq(schema.taskComment.id, comment_id));

		await tx.insert(schema.taskCommentHistory).values({
			organizationId: comment.organizationId,
			taskId: comment.taskId,
			commentId: comment.id,
			editedBy: session?.userId,
			content: content, // new content snapshot
		});
	});

	const found = findClientByWsId(wsClientId);
	const data = { type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"], data: { id: comment.taskId } };
	broadcastToRoom(org_id, `task:${comment.taskId}`, data, found?.socket, false);
	broadcastPublic(org_id, { ...data });
	const members = await getOrganizationMembers(org_id);
	members.forEach((member) => {
		const clients = findClientsByUserId(member.userId);
		clients.forEach(
			(c) =>
				c.wsClientId !== wsClientId &&
				c.orgId !== org_id &&
				!(c.channel === `task:${comment.taskId}` || c.channel === "tasks") &&
				broadcastIndividual(c.socket, data, org_id)
		);
	});
	wideEvent.taskCommentEdit = {
		organizationId: org_id,
		editedByUserId: session?.userId || "",
		commentId: comment_id,
		taskId: comment.taskId,
		visibility: visibility,
	};
	return c.json({ success: true, data: { id: comment.taskId } });
});

apiRouteAdminProjectTask.get("/get-comment-history", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Get task comment history requested";
	const query = c.req.query();
	const org_id = query.org_id;
	const task_id = query.task_id;
	const comment_id = query.comment_id;
	const session = c.get("session");

	if (!org_id || !task_id || !comment_id) {
		wideEvent.error = {
			type: "ValidationError",
			code: "MISSING_PARAMETERS",
			message: "One or more required parameters are missing",
		};
		return c.json({ success: false, error: "Missing params" }, 400);
	}

	// Basic org-level check
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id, "members");
	if (!isAuthorized) {
		wideEvent.error = {
			type: "AuthorizationError",
			code: "Unauthorized",
			message: "User does not have permission to view task comment history",
		};
		return c.json({ success: false, error: "You don’t have permission to do that." }, 401);
	}

	// Directly query history (faster: skip extra join with main comment table)
	const history = await db
		.select()
		.from(schema.taskCommentHistory)
		.where((t) => and(eq(t.organizationId, org_id), eq(t.taskId, task_id), eq(t.commentId, comment_id)))
		.orderBy((t) => [desc(t.editedAt)]);

	wideEvent.taskCommentHistoryFetch = {
		organizationId: org_id,
		requestedByUserId: session?.userId || "",
		taskId: task_id,
		commentId: comment_id,
		historyCount: history.length,
	};
	return c.json({ success: true, data: history });
});

// Get merged task activity timeline
apiRouteAdminProjectTask.get("/timeline", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Get task timeline requested";
	const query = c.req.query();
	const org_id = query.org_id;
	const task_id = query.task_id;

	// --- Validate required parameters ---
	const missingParams = [];
	if (!org_id) missingParams.push("org_id");
	if (!task_id) missingParams.push("task_id");

	if (missingParams.length > 0) {
		wideEvent.error = {
			type: "ValidationError",
			code: "MISSING_PARAMETERS",
			message: `The following parameters are required: ${missingParams.join(", ")}`,
		};
		return c.json(
			{
				success: false,
				error: "MISSING_PARAMETERS",
				message: `The following parameters are required: ${missingParams.join(", ")}`,
			},
			400
		);
	}

	const session = c.get("session");

	// --- Authorization ---
	const isAuthorized = await hasOrgPermission(session?.userId || "", org_id || "", "members");
	if (!isAuthorized) {
		// --- Fetch task & comments ---
		const timeline = await getMergedTaskActivity(org_id || "", task_id || "", true);
		wideEvent.taskTimelineFetch = {
			organizationId: org_id,
			requestedByUserId: session?.userId || "",
			taskId: task_id,
			authorized: false,
		};
		return c.json({
			success: true,
			data: timeline,
		});
	}
	// --- Fetch task & comments ---
	const timeline = await getMergedTaskActivity(org_id || "", task_id || "", false);
	wideEvent.taskTimelineFetch = {
		organizationId: org_id,
		requestedByUserId: session?.userId || "",
		taskId: task_id,
		authorized: true,
	};
	return c.json({
		success: true,
		data: timeline,
	});
});

apiRouteAdminProjectTask.get("/timeline/activity", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Get task timeline activity requested";
	const query = c.req.query();
	const org_id = query.org_id;
	const task_id = query.task_id;
	// --- Validate required parameters ---
	const missingParams = [];
	if (!org_id) missingParams.push("org_id");
	if (!task_id) missingParams.push("task_id");
	if (missingParams.length > 0) {
		wideEvent.error = {
			type: "ValidationError",
			code: "MISSING_PARAMETERS",
			message: `The following parameters are required: ${missingParams.join(", ")}`,
		};
		return c.json(
			{
				success: false,
				error: "MISSING_PARAMETERS",
				message: `The following parameters are required: ${missingParams.join(", ")}`,
			},
			400
		);
	}
	const timeline = await getTaskTimeline(org_id || "", task_id || "");
	wideEvent.taskTimelineActivityFetch = {
		organizationId: org_id,
		taskId: task_id,
	};
	return c.json({
		success: true,
		data: timeline,
	});
});

apiRouteAdminProjectTask.get("/timeline/comments", async (c) => {
	try {
		const wideEvent = c.get("wideEvent");
		wideEvent.description = "Get task comments requested";
		console.time("⏱ comments");
		const q = c.req.query();
		const orgId = q.org_id;
		const taskId = q.task_id;

		if (!orgId || !taskId) {
			wideEvent.error = {
				type: "ValidationError",
				code: "MISSING_PARAMETERS",
				message: "org_id and task_id are required",
			};
			return c.json({ success: false, error: "MISSING_PARAMETERS" }, 400);
		}

		const session = c.get("session");
		const isPublic = !session || !(await hasOrgPermission(session?.userId, orgId || "", "members"));

		// --- Pagination setup
		const page = Math.max(Number(q.page) || 1, 1);
		const limit = Math.min(Number(q.limit) || 20, 50);
		const offset = (page - 1) * limit;

		const base = and(
			eq(schema.taskComment.organizationId, orgId),
			eq(schema.taskComment.taskId, taskId),
			isPublic ? eq(schema.taskComment.visibility, "public") : undefined
		);

		// --- Count total
		const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.taskComment).where(base);

		const totalItems = Number(countResult?.count ?? 0);
		const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

		// --- Fetch one page ordered by createdAt ASC (oldest first)
		const pageRows = await db.query.taskComment.findMany({
			where: () => base,
			orderBy: (t, { asc }) => asc(t.createdAt),
			limit,
			offset,
			with: {
				createdBy: {
					columns: { name: true, image: true },
				},
			},
		});
		// --- Map to unified timeline format
		const data = pageRows.map((item) => ({
			...item,
			eventType: "comment" as const,
			actor: item.createdBy,
		}));
		console.timeEnd("⏱ comments");
		wideEvent.taskTimelineCommentsFetch = {
			organizationId: orgId,
			requestedByUserId: session?.userId || "",
			taskId: taskId,
			page,
			limit,
			totalItems,
			totalPages,
			isPublic,
		};
		// --- Return response
		return c.json({
			success: true,
			data,
			pagination: {
				page,
				limit,
				totalItems,
				totalPages,
				hasMore: page < totalPages,
			},
		});
	} catch (err) {
		console.error("🚨 timeline/comments error:", err);
		return c.json({ success: false, message: (err as Error)?.message }, 500);
	}
});

apiRouteAdminProjectTask.get("/timeline/comments/count", async (c) => {
	const wideEvent = c.get("wideEvent");
	wideEvent.description = "Get task comments count requested";
	// -------------------------------
	// Just parse query params
	// -------------------------------
	const { org_id: orgId, task_id: taskId, limit } = c.req.query();
	if (!orgId || !taskId) {
		wideEvent.error = {
			type: "ValidationError",
			code: "MISSING_PARAMETERS",
			message: "org_id and task_id are required",
		};
		return c.json({ success: false, error: "MISSING_PARAMETERS" }, 400);
	}
	// Limit: optional, capped at 50 for sanity
	const perPage = Math.min(Number(limit) || 9, 50);
	console.time("⏱ quick-count");
	// -------------------------------
	// Super lightweight count
	// -------------------------------
	const result = await db.execute(
		sql<{ count: number }>`
      SELECT count(*)::int AS count
      FROM task_comment
      WHERE organization_id = ${orgId}
        AND task_id = ${taskId};
    `
	);
	console.timeEnd("⏱ quick-count");
	const totalItems = Number(result[0]?.count ?? 0);
	const totalPages = Math.max(Math.ceil(totalItems / perPage), 1);
	// -------------------------------
	// Respond — minimal JSON
	// -------------------------------
	wideEvent.taskTimelineCommentsCountFetch = {
		organizationId: orgId,
		taskId: taskId,
		totalItems,
		totalPages,
		limit: perPage,
	};
	return c.json({
		success: true,
		pagination: { totalItems, totalPages, limit: perPage },
	});
});
