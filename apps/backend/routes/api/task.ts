import type { auth } from "@repo/auth";
import { addLabelToTask, addLogEventTask, createTask, db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { broadcast, broadcastPublic, findClientByWsId } from "../ws";

export const apiRouteAdminProjectTask = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();
apiRouteAdminProjectTask.post("/create", async (c) => {
	try {
		const { org_id, wsClientId, project_id, title, description, status, priority, labels, assignees } =
			await c.req.json();
		const session = c.get("session");
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, org_id)));
		if (role[0]?.role !== "owner") {
			return c.json({ error: "UNAUTHORIZED" }, 401);
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
			return c.json({ path: c.req.path, error: "Failed to create task" }, 500);
		}
		await addLogEventTask(
			task.id,
			project_id,
			org_id,
			"created",
			null,
			{ status, priority, title, labels },
			session?.userId,
			description
		);
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
		// Refetch with full labels
		const taskWithLabels = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task.id), eq(t.organizationId, org_id), eq(t.projectId, project_id)),
			with: {
				labels: { with: { label: true } },
				createdBy: {
					columns: {
						id: true,
						name: true,
						image: true,
					},
				},
				assignees: {
					with: {
						user: {
							columns: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				},
				timeline: {
					with: {
						actor: {
							columns: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				},
				comments: {
					with: {
						createdBy: {
							columns: {
								id: true,
								name: true,
								image: true,
							},
						},
					},
				},
			},
		});

		const cleanTask = {
			...taskWithLabels,
			labels: taskWithLabels?.labels.map((l) => l.label),
			assignees: taskWithLabels?.assignees.map((a) => a.user),
		};
		const found = findClientByWsId(wsClientId);
		const data = {
			type: "CREATE_TASK",
			data: cleanTask,
		};
		broadcast(org_id, `project-${project_id}`, data, found?.socket);
		broadcastPublic(org_id, { ...data, data: data });
		return c.json({
			success: true,
			data: cleanTask,
		});
		// biome-ignore lint/suspicious/noExplicitAny: <has to be any>
	} catch (error: any) {
		console.log("🚀 ~ error:", error);
		return c.json(
			{
				path: c.req.path,
				error: error.toString(),
			},
			error.statusCode
		);
	}
});
apiRouteAdminProjectTask.patch("/update", async (c) => {
	try {
		const { org_id, wsClientId, project_id, task_id, ...updates } = await c.req.json();
		const session = c.get("session");

		// 🔒 RBAC check: only org owner can update
		const [membership] = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, org_id)));
		if (membership?.role !== "owner") {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}

		// 🔎 Check task existence
		const existingTask = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id), eq(t.projectId, project_id)),
		});
		if (!existingTask) {
			return c.json({ error: "Task not found" }, 404);
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
			await addLogEventTask(
				task_id,
				project_id,
				org_id,
				"updated",
				existingTask.title,
				updates.title,
				session?.userId
			);
		}
		if (updates.description && JSON.stringify(updates.description) !== JSON.stringify(existingTask.description)) {
			await addLogEventTask(
				task_id,
				project_id,
				org_id,
				"updated",
				existingTask.description,
				updates.description,
				session?.userId
			);
		}

		// 🏷 Step 3: Handle labels
		if (updates.labels && Array.isArray(updates.labels)) {
			for (const labelId of updates.labels) {
				await addLabelToTask(org_id, task_id, project_id, labelId);
				// await addLogEventTask(task_id, project_id, org_id, "label_added", null, labelId, session?.userId);
			}
		}

		// 👥 Step 4: Handle assignees
		if (updates.assignees && Array.isArray(updates.assignees)) {
			for (const userId of updates.assignees) {
				await db
					.insert(schema.taskAssignee)
					.values({ taskId: task_id, projectId: project_id, userId })
					.onConflictDoNothing();
			}
		}

		// 🔄 Step 5: Refetch task with relations
		const taskWithData = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id), eq(t.projectId, project_id)),
			with: {
				labels: { with: { label: true } },
				createdBy: { columns: { id: true, name: true, image: true } },
				assignees: {
					with: { user: { columns: { id: true, name: true, image: true } } },
				},
				timeline: {
					with: { actor: { columns: { id: true, name: true, image: true } } },
				},
				comments: {
					with: {
						createdBy: { columns: { id: true, name: true, image: true } },
					},
				},
			},
		});

		const cleanTask = {
			...taskWithData,
			labels: taskWithData?.labels.map((l) => l.label),
			assignees: taskWithData?.assignees.map((a) => a.user),
		};

		// 📢 Step 6: Broadcast one unified update
		const found = findClientByWsId(wsClientId);
		const data = { type: "UPDATE_TASK", data: cleanTask };

		broadcast(org_id, `project-${project_id}`, data, found?.socket);
		broadcastPublic(org_id, { ...data });

		return c.json({ success: true, data: cleanTask });
		// biome-ignore lint/suspicious/noExplicitAny: <needed for error shit>
	} catch (error: any) {
		console.error("🚀 ~ error:", error);
		return c.json({ path: c.req.path, error: error.toString() }, error.statusCode);
	}
});
