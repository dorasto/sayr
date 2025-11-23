import { addLogEventTask, db, getOrganizationMembers, getTaskById, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import type { WSBaseMessage } from "@/routes/ws/types";
import { broadcastIndividual, broadcastPublic, broadcastToRoom, findClientsByUserId } from "../ws";

// Main API router
export const internalRoute = new Hono<AppEnv>();
internalRoute.post("/github-close-task", async (c) => {
	const { orgId, shortId } = await c.req.json();
	const existingTask = await db.query.task.findFirst({
		where: (t) => and(eq(t.shortId, shortId), eq(t.organizationId, orgId)),
	});
	if (!existingTask) {
		return c.json({ success: false, error: "Task not found" }, 404);
	}
	await db
		.update(schema.task)
		.set({ status: "done", updatedAt: new Date() })
		.where(and(eq(schema.task.shortId, shortId), eq(schema.task.organizationId, orgId)))
		.returning();
	if ("done" !== existingTask.status) {
		await addLogEventTask(
			existingTask.id,
			orgId,
			"status_change",
			existingTask.status,
			"done",
			"35720E39-A509-465A-8324-C1DFA16A15BA"
		);
	}
	const taskWithData = await getTaskById(orgId, existingTask.id);
	const data = { type: "UPDATE_TASK" as WSBaseMessage["type"], data: taskWithData };
	broadcastToRoom(orgId, `tasks;task:${existingTask.id}`, data, undefined, true);
	broadcastPublic(orgId, { ...data });
	const members = await getOrganizationMembers(orgId);
	members.forEach((member) => {
		const clients = findClientsByUserId(member.userId);
		clients.forEach(
			(c) =>
				c.orgId !== orgId &&
				(c.channel !== `task:${existingTask.id}` || c.channel !== "tasks") &&
				broadcastIndividual(c.socket, data, orgId)
		);
	});
	return c.json({ success: true, data: taskWithData });
});
