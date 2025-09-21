import type { auth } from "@repo/auth";
import { createProject, db, getOrganizationMembers, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { broadcast, broadcastIndividual, broadcastPublic, findClientByWsId, findClientsByUserId } from "../ws";
import { apiRouteAdminProjectTask } from "./task";

export const apiRouteAdminProject = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();
apiRouteAdminProject.post("/create", async (c) => {
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

apiRouteAdminProject.route("/task", apiRouteAdminProjectTask);
