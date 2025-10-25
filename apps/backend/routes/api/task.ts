import {
	addLabelToTask,
	addLogEventTask,
	createComment,
	createTask,
	db,
	getMergedTaskActivity,
	getTaskById,
	removeLabelFromTask,
	schema,
} from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import type { WSBaseMessage } from "@/routes/ws/types";
import { checkMembershipRole } from "@/util";
// import { enqueueJob } from "@/queue";
import { broadcast, broadcastPublic, broadcastToRoom, findClientByWsId } from "../ws";

export const apiRouteAdminProjectTask = new Hono<AppEnv>();
apiRouteAdminProjectTask.post("/create", async (c) => {
	const { org_id, wsClientId, project_id, title, description, status, priority, labels, assignees } =
		await c.req.json();
	const session = c.get("session");
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const task = await createTask(
		org_id,
		project_id,
		{
			title,
			description,
			status,
			priority,
		},
		session?.userId
	);

	if (!task) {
		return c.json({ success: false, path: c.req.path, error: "Failed to create task" }, 500);
	}
	if (labels && labels.length > 0) {
		for (const labelId of labels) {
			await addLabelToTask(org_id, task.id, project_id, labelId);
		}
	}
	// Attach assignees if provided
	if (assignees?.length > 0) {
		for (const userId of assignees) {
			await db
				.insert(schema.taskAssignee)
				.values({
					taskId: task.id,
					projectId: project_id,
					userId,
				})
				.onConflictDoNothing(); // avoid duplicate assignments
		}
	}
	await addLogEventTask(
		task.id,
		project_id,
		org_id,
		"created",
		null,
		{ status, priority, title, labels, assignees },
		session?.userId,
		description
	);
	// Refetch with full labels
	const taskWithData = await getTaskById(org_id, project_id, task.id);

	const found = findClientByWsId(wsClientId);
	const data = {
		type: "CREATE_TASK" as WSBaseMessage["type"],
		data: taskWithData,
	};
	broadcast(org_id, `project:${project_id}`, data, found?.socket);
	broadcastPublic(org_id, { ...data, data: data });
	return c.json({
		success: true,
		data: taskWithData,
	});
});
apiRouteAdminProjectTask.patch("/update", async (c) => {
	const { org_id, wsClientId, project_id, task_id, ...updates } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	// 🔎 Check task existence
	const existingTask = await db.query.task.findFirst({
		where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id), eq(t.projectId, project_id)),
	});
	if (!existingTask) {
		return c.json({ success: false, error: "Task not found" }, 404);
	}

	// 🎯 Pick only fields allowed for update
	const allowed: Partial<schema.taskType> = {};
	["title", "description", "status", "priority"].forEach((field) => {
		if (updates[field] !== undefined) {
			// @ts-expect-error because dynamic field assignment
			allowed[field] = updates[field];
		}
	});

	if (Object.keys(allowed).length > 0) {
		await db
			.update(schema.task)
			.set({ ...allowed, updatedAt: new Date() })
			.where(eq(schema.task.id, task_id))
			.returning();
	}

	// 📝 Step 2: Log timeline changes
	if (updates.status && updates.status !== existingTask.status) {
		await addLogEventTask(
			task_id,
			project_id,
			org_id,
			"status_change",
			existingTask.status,
			updates.status,
			session?.userId
		);
	}
	if (updates.priority && updates.priority !== existingTask.priority) {
		await addLogEventTask(
			task_id,
			project_id,
			org_id,
			"priority_change",
			existingTask.priority,
			updates.priority,
			session?.userId
		);
	}
	if (updates.title && updates.title !== existingTask.title) {
		await addLogEventTask(task_id, project_id, org_id, "updated", existingTask.title, updates.title, session?.userId);
	}
	if (updates.description && JSON.stringify(updates.description) !== JSON.stringify(existingTask.description)) {
		await addLogEventTask(
			task_id,
			project_id,
			org_id,
			"updated",
			existingTask.description,
			updates.description,
			session?.userId,
			updates.description
		);
	}

	// 🔄 Step 3: Refetch task with relations
	const taskWithData = await getTaskById(org_id, project_id, task_id);

	// 📢 Step 4: Broadcast one unified update
	const found = findClientByWsId(wsClientId);
	const data = { type: "UPDATE_TASK" as WSBaseMessage["type"], data: taskWithData };
	broadcastToRoom(org_id, `project:${project_id};task:${task_id}`, data, found?.socket, true);
	broadcastPublic(org_id, { ...data });

	return c.json({ success: true, data: taskWithData });
});

apiRouteAdminProjectTask.post("/update-labels", async (c) => {
	const { org_id, wsClientId, project_id, task_id, labels } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	// const key = `${org_id}:${project_id}:${task_id}`;

	try {
		// const taskWithData = await enqueueJob(key, async () => {
		// 🔎 Check task existence with labels
		const existingTask = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id), eq(t.projectId, project_id)),
			with: {
				labels: { with: { label: true } },
			},
		});

		if (!existingTask) {
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
				await addLabelToTask(org_id, task_id, project_id, labelId);
				await addLogEventTask(task_id, project_id, org_id, "label_added", null, labelId, session?.userId);
			}
		}

		// 2️⃣ Remove labels not in incoming list
		for (const labelId of currentLabelIds) {
			if (!incomingLabelIds.includes(labelId)) {
				await removeLabelFromTask(org_id, task_id, project_id, labelId);
				await addLogEventTask(task_id, project_id, org_id, "label_removed", null, labelId, session?.userId);
			}
		}

		const taskWithData = await getTaskById(org_id, project_id, task_id);
		// });

		// // undefined means this wasn’t the latest — skip returning older state
		// if (taskWithData === undefined) {
		// 	return c.json({ success: true, skipped: true }, 202);
		// }

		const found = findClientByWsId(wsClientId);
		const data = { type: "UPDATE_TASK" as WSBaseMessage["type"], data: taskWithData };
		broadcastToRoom(org_id, `project:${project_id};task:${task_id}`, data, found?.socket, true);
		broadcastPublic(org_id, { ...data });

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

apiRouteAdminProjectTask.post("/update-assignees", async (c) => {
	const { org_id, wsClientId, project_id, task_id, assignees } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	// const key = `${org_id}:${project_id}:${task_id}`;
	try {
		// const taskWithData = await enqueueJob(key, async () => {
		// 🔎 Check task existence with labels
		const existingTask = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id), eq(t.projectId, project_id)),
			with: {
				assignees: {
					with: { user: { columns: { id: true, name: true, image: true } } },
				},
			},
		});

		if (!existingTask) {
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
					.values({ taskId: task_id, projectId: project_id, userId })
					.onConflictDoNothing();
				await addLogEventTask(task_id, project_id, org_id, "assignee_added", null, userId, session?.userId);
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
							eq(schema.taskAssignee.projectId, project_id),
							eq(schema.taskAssignee.userId, userId)
						)
					);
				await addLogEventTask(task_id, project_id, org_id, "assignee_removed", null, userId, session?.userId);
			}
		}

		// 🔄 Fetch updated task with related data
		const taskWithData = await getTaskById(org_id, project_id, task_id);
		// return taskWithData;
		// });

		// undefined means this wasn’t the latest — skip returning older state
		// if (taskWithData === undefined) {
		// 	return c.json({ success: true, skipped: true }, 202);
		// }

		const found = findClientByWsId(wsClientId);
		const data = { type: "UPDATE_TASK" as WSBaseMessage["type"], data: taskWithData };
		broadcastToRoom(org_id, `project:${project_id};task:${task_id}`, data, found?.socket, true);
		broadcastPublic(org_id, { ...data });

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

apiRouteAdminProjectTask.post("/create-comment", async (c) => {
	const { org_id, wsClientId, project_id, task_id, blocknote } = await c.req.json();
	const session = c.get("session");

	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const key = `${org_id}:${project_id}:${task_id}`;
	await createComment(org_id, project_id, task_id, blocknote, session?.userId);
	const found = findClientByWsId(wsClientId);
	const data = { type: "UPDATE_TASK_COMMENTS" as WSBaseMessage["type"], data: { id: task_id } };
	broadcastToRoom(org_id, `project:${project_id};task:${task_id}`, data, found?.socket, true);
	broadcastPublic(org_id, { ...data });
	console.log("key:", key);
	return c.json({ success: true, data: { id: task_id } });
});

apiRouteAdminProjectTask.get("/timeline", async (c) => {
	const query = c.req.query();
	const org_id = query.org_id;
	const project_id = query.project_id;
	const task_id = query.task_id;

	// --- Validate required parameters ---
	const missingParams = [];
	if (!org_id) missingParams.push("org_id");
	if (!project_id) missingParams.push("project_id");
	if (!task_id) missingParams.push("task_id");

	if (missingParams.length > 0) {
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
	const isAuthorized = await checkMembershipRole(session?.userId, org_id || "");
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	// --- Fetch task & comments ---
	const timeline = await getMergedTaskActivity(org_id || "", project_id || "", task_id || "");

	return c.json({
		success: true,
		data: timeline,
	});
});
