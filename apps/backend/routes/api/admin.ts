import type { auth } from "@repo/auth";
import { db, getOrganizationMembers, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { broadcast, broadcastPublic, findClientByWsId, findClientsByUserId, send } from "../ws";

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
		console.log("🚀 ~ roles:", role[0]?.role);
		console.log("hasPermission fetch took", Date.now() - start, "ms");
		if (role[0]?.role === "owner") {
			const startNew = Date.now();
			const result = await db
				.update(schema.organization)
				.set({ ...data, updatedAt: new Date() })
				.where(eq(schema.organization.id, org_id))
				.returning();
			console.log("updateOrganization fetch took", Date.now() - startNew, "ms");

			if (result[0]) {
				const found = findClientByWsId(wsClientId);
				broadcast(org_id, "admin", { type: "UPDATE_ORG", data: result[0] }, found?.socket);
				broadcastPublic(org_id, { type: "UPDATE_ORG", data: result[0] });
				const members = await getOrganizationMembers(org_id);
				members.forEach((member) => {
					const clients = findClientsByUserId(member.userId);
					clients.forEach((c) => send(c.socket, { type: "UPDATE_ORG_GLOBAL", data: result[0] }));
				});
				return c.json({ success: true, data: result[0] });
			}
		}
		return c.json({ error: "UNAUTHORIZED" }, 401);
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
