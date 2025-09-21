import type { auth } from "@repo/auth";
import { addLabelToTask, createProject, db, getOrganizationMembers, logTaskEvent, schema } from "@repo/database";
import { listFileObjectsWithMetadata, removeObject, uploadObject } from "@repo/storage";
import { ensureCdnUrl, getFileNameFromUrl } from "@repo/util";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { broadcast, broadcastIndividual, broadcastPublic, findClientByWsId, findClientsByUserId } from "../ws";

export const apiRouteAdmin = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();
apiRouteAdmin.post("/update-org", async (c) => {
	try {
		const { org_id, wsClientId, data } = await c.req.json();
		const session = c.get("session");
		const start = Date.now();
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, org_id)));
		if (role[0]?.role !== "owner") {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}
		console.log("hasPermission fetch took", Date.now() - start, "ms");
		const startNew = Date.now();
		const [result] = await db
			.update(schema.organization)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(schema.organization.id, org_id))
			.returning();
		console.log("updateOrganization fetch took", Date.now() - startNew, "ms");
		if (result) {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "UPDATE_ORG",
				data: {
					...result,
					logo: result.logo ? ensureCdnUrl(result.logo) : null,
					bannerImg: result.bannerImg ? ensureCdnUrl(result.bannerImg) : null,
				},
			};
			broadcast(org_id, "admin", data, found?.socket);
			broadcastPublic(org_id, { ...data, data: { ...data.data, privateId: null } });
			const members = await getOrganizationMembers(org_id);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach((c) => broadcastIndividual(c.socket, data));
			});
			return c.json({
				success: true,
				data: {
					...result,
					logo: result.logo ? ensureCdnUrl(result.logo) : null,
					bannerImg: result.bannerImg ? ensureCdnUrl(result.bannerImg) : null,
				},
			});
		}
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
apiRouteAdmin.post("/create-project", async (c) => {
	try {
		const { org_id, wsClientId, name, description } = await c.req.json();
		const session = c.get("session");
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, org_id)));
		if (role[0]?.role !== "owner") {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}
		const result = await createProject(org_id, name, description);
		if (result.success) {
			const found = findClientByWsId(wsClientId);
			const data = {
				type: "CREATE_PROJECT",
				data: result.data,
			};
			broadcast(org_id, "admin", data, found?.socket);
			broadcastPublic(org_id, { ...data, data: data });
			const members = await getOrganizationMembers(org_id);
			members.forEach((member) => {
				const clients = findClientsByUserId(member.userId);
				clients.forEach((c) => broadcastIndividual(c.socket, data));
			});
			return c.json({
				success: true,
				data: data,
			});
		} else {
			return c.json(
				{
					path: c.req.path,
					error: result.error,
				},
				500
			);
		}
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
apiRouteAdmin.post("/create-task", async (c) => {
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
		const [max] = (await db
			.select({ max: sql<number>`MAX(${schema.task.shortId})` })
			.from(schema.task)
			.where(eq(schema.task.projectId, project_id))) || [{ max: 0 }];

		const nextShortId = (max?.max ?? 0) + 1;
		const [task] = await db
			.insert(schema.task)
			.values({
				organizationId: org_id,
				projectId: project_id,
				shortId: nextShortId,
				title: title,
				description: description,
				status: status,
				priority: priority,
				createdBy: session?.userId || null, // allow null = ANONYMOUS
			})
			.returning();
		if (!task) {
			return c.json({ path: c.req.path, error: "Failed to create task" }, 500);
		}
		const [taskTimelineNext] = await db
			.select({ max: sql<number>`MAX(${schema.taskTimeline.timelineNumber})` })
			.from(schema.taskTimeline)
			.where(eq(schema.taskTimeline.taskId, task.id));

		const nextId = (taskTimelineNext?.max ?? 0) + 1;
		// ⏺ Log timeline event: created
		await logTaskEvent({
			timelineNumber: nextId,
			taskId: task.id,
			projectId: project_id,
			organizationId: org_id,
			actorId: session?.userId ?? null,
			eventType: "created",
			toValue: { status, priority, title }, // Show initial values
		});
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
apiRouteAdmin.patch("/update-task", async (c) => {
	try {
		const { org_id, wsClientId, project_id, task_id, ...updates } = await c.req.json();
		const session = c.get("session");

		// RBAC check
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, org_id)));
		if (role[0]?.role !== "owner") {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}

		// Get the existing task
		const existingTask = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id), eq(t.projectId, project_id)),
		});
		if (!existingTask) {
			return c.json({ error: "Task not found" }, 404);
		}

		// Step 1: Only update fields passed in
		const allowedUpdates: Partial<schema.taskType> = {};
		if (updates.title !== undefined) allowedUpdates.title = updates.title;
		if (updates.description !== undefined) allowedUpdates.description = updates.description;
		if (updates.status !== undefined) allowedUpdates.status = updates.status;
		if (updates.priority !== undefined) allowedUpdates.priority = updates.priority;

		let updatedTask: schema.taskType | undefined;

		if (Object.keys(allowedUpdates).length > 0) {
			const [u] = await db
				.update(schema.task)
				.set({ ...allowedUpdates, updatedAt: new Date() })
				.where(eq(schema.task.id, task_id))
				.returning();
			updatedTask = u;
		} else {
			updatedTask = existingTask;
		}

		// Step 2: Log timeline events
		const [max] = (await db
			.select({ max: sql<number>`MAX(${schema.taskTimeline.timelineNumber})` })
			.from(schema.taskTimeline)
			.where(eq(schema.taskTimeline.taskId, task_id))) || [{ max: 0 }];
		let timelineNumber = max?.max ?? 0;

		if (updates.status && updates.status !== existingTask.status) {
			timelineNumber++;
			await logTaskEvent({
				timelineNumber,
				taskId: task_id,
				projectId: project_id,
				organizationId: org_id,
				actorId: session?.userId ?? null,
				eventType: "status_change",
				fromValue: existingTask.status,
				toValue: updates.status,
			});
		}
		if (updates.priority && updates.priority !== existingTask.priority) {
			timelineNumber++;
			await logTaskEvent({
				timelineNumber,
				taskId: task_id,
				projectId: project_id,
				organizationId: org_id,
				actorId: session?.userId ?? null,
				eventType: "priority_change",
				fromValue: existingTask.priority,
				toValue: updates.priority,
			});
		}
		if (updates.title && updates.title !== existingTask.title) {
			timelineNumber++;
			await logTaskEvent({
				timelineNumber,
				taskId: task_id,
				projectId: project_id,
				organizationId: org_id,
				actorId: session?.userId ?? null,
				eventType: "updated",
				fromValue: existingTask.title,
				toValue: updates.title,
			});
		}
		if (updates.description && JSON.stringify(updates.description) !== JSON.stringify(existingTask.description)) {
			timelineNumber++;
			await logTaskEvent({
				timelineNumber,
				taskId: task_id,
				projectId: project_id,
				organizationId: org_id,
				actorId: session?.userId ?? null,
				eventType: "updated",
				fromValue: existingTask.description,
				toValue: updates.description,
			});
		}

		// Step 3: Handle labels
		if (updates.labels && Array.isArray(updates.labels)) {
			for (const labelId of updates.labels) {
				await addLabelToTask(org_id, task_id, project_id, labelId);
			}
		}

		// Step 4: Handle assignees
		if (updates.assignees && Array.isArray(updates.assignees)) {
			for (const userId of updates.assignees) {
				await db
					.insert(schema.taskAssignee)
					.values({ taskId: task_id, projectId: project_id, userId })
					.onConflictDoNothing();
			}
		}

		// Step 5: Refetch with relations
		const taskWithData = await db.query.task.findFirst({
			where: (t) => and(eq(t.id, task_id), eq(t.organizationId, org_id), eq(t.projectId, project_id)),
			with: {
				labels: { with: { label: true } },
				createdBy: {
					columns: { id: true, name: true, image: true },
				},
				assignees: {
					with: { user: { columns: { id: true, name: true, image: true } } },
				},
				timeline: {
					with: { actor: { columns: { id: true, name: true, image: true } } },
				},
				comments: {
					with: { createdBy: { columns: { id: true, name: true, image: true } } },
				},
			},
		});

		const cleanTask = {
			...taskWithData,
			labels: taskWithData?.labels.map((l) => l.label),
			assignees: taskWithData?.assignees.map((a) => a.user),
		};

		// Broadcast updates
		const found = findClientByWsId(wsClientId);
		const data = { type: "UPDATE_TASK", data: cleanTask };
		broadcast(org_id, `project-${project_id}`, data, found?.socket);
		broadcastPublic(org_id, { ...data });

		return c.json({ success: true, data: cleanTask });
		// biome-ignore lint/suspicious/noExplicitAny: <any>
	} catch (error: any) {
		console.error("🚀 ~ error:", error);
		return c.json({ path: c.req.path, error: error.toString() }, error.statusCode);
	}
});
apiRouteAdmin.put("/orgs/:orgId/logo", async (c) => {
	try {
		const session = c.get("session");
		const user = c.get("user");
		const orgId = c.req.param("orgId");
		const oldLogo = c.req.header("X-old-file");
		// 1. Verify membership + role
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, orgId)));

		if (role[0]?.role !== "owner" && role[0]?.role !== "admin") {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}

		// 2. Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			return c.text("No file uploaded", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		// Preserve the original extension based on file name or MIME
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
		const objectName = `/logo.${ext}`;
		if (oldLogo) {
			await removeObject(`organization/${orgId}/${getFileNameFromUrl(oldLogo)}`);
		}
		// 3. Upload to storage
		const imagelogo = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			"user-id": user?.id || "ANONYMOUS",
			"org-id": orgId,
			"original-name": file.name, // store as metadata
		});

		// 4. Build result payload
		return c.json({
			success: true,
			orgId,
			originalName: file.name,
			image: imagelogo, // this should be the stored URL or object path
		});
		// biome-ignore lint/suspicious/noExplicitAny: <test>
	} catch (err: any) {
		console.error("Upload failed:", err.message);
		return c.text("Upload failed", 500);
	}
});

apiRouteAdmin.put("/orgs/:orgId/banner", async (c) => {
	try {
		const session = c.get("session");
		const user = c.get("user");
		const orgId = c.req.param("orgId");
		const oldBanner = c.req.header("X-old-file");

		// 1. Verify membership + role
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, orgId)));

		if (role[0]?.role !== "owner" && role[0]?.role !== "admin") {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}

		// 2. Parse multipart body
		const body = await c.req.parseBody();
		const file = body.file;
		if (!file || !(file instanceof File)) {
			return c.text("No file uploaded", 400);
		}

		const buffer = Buffer.from(await file.arrayBuffer());

		// Preserve the original extension based on file name or MIME
		const ext = file.name.split(".").pop() || file.type.split("/")[1] || "png";
		const objectName = `banner.${ext}`;
		if (oldBanner) {
			await removeObject(`organization/${orgId}/${getFileNameFromUrl(oldBanner)}`);
		}
		// 3. Upload to storage
		const imagebanner = await uploadObject(objectName, buffer, `organization/${orgId}`, {
			"Content-Type": file.type || "application/octet-stream",
			"user-id": user?.id || "ANONYMOUS",
			"org-id": orgId,
			"original-name": file.name, // store as metadata
		});

		// 4. Build result payload
		return c.json({
			success: true,
			orgId,
			originalName: file.name,
			image: imagebanner, // this should be the stored URL or object path
		});
		// biome-ignore lint/suspicious/noExplicitAny: <test>
	} catch (err: any) {
		console.error("Upload failed:", err.message);
		return c.text("Upload failed", 500);
	}
});

apiRouteAdmin.get("/test/:orgId", async (c) => {
	try {
		const session = c.get("session");
		const orgId = c.req.param("orgId");

		// 1. Verify membership + role
		const role = await db
			.select()
			.from(schema.member)
			.where(and(eq(schema.member.userId, session?.userId || ""), eq(schema.member.organizationId, orgId)));

		if (role[0]?.role !== "owner" && role[0]?.role !== "admin") {
			return c.json({ error: "UNAUTHORIZED" }, 401);
		}
		const data = await listFileObjectsWithMetadata(`organization/${orgId}`);
		data.map((item) => {
			item.name = ensureCdnUrl(item.name || "");
		});
		return c.json(data);
		// biome-ignore lint/suspicious/noExplicitAny: <any>
	} catch (err: any) {
		console.error("Upload failed:", err.message);
		return c.text("Upload failed", 500);
	}
});
