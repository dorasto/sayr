import type { auth } from "@repo/auth";
import { auth as authType, db } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { broadcast, findClientByWsId } from "../ws";

export const apiRouteAdmin = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
		organization: typeof auth.$Infer.Organization | null;
	};
}>();
apiRouteAdmin.post("/update-org", async (c) => {
	try {
		const { org_id, wsClientId, data } = await c.req.json();
		const session = c.get("session");
		const start = Date.now();
		const role = await db
			.select()
			.from(authType.member)
			.where(and(eq(authType.member.userId, session?.userId || ""), eq(authType.member.organizationId, org_id)));
		console.log("🚀 ~ roles:", role[0]?.role);
		console.log("hasPermission fetch took", Date.now() - start, "ms");

		const startNew = Date.now();
		const result = await db
			.update(authType.organization)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(authType.organization.id, org_id))
			.returning();
		console.log("updateOrganization fetch took", Date.now() - startNew, "ms");

		if (result[0]) {
			const found = findClientByWsId(wsClientId);
			broadcast(org_id, "admin", { type: "UPDATE_ORG", data: result[0] }, found?.socket);
			return c.json({ success: true, data: result[0] });
		}
		return c.json({ error: "UNAUTHORIZED" }, 401);
		// biome-ignore lint/suspicious/noExplicitAny: <has to be any>
	} catch (error: any) {
		console.log("🚀 ~ error:", error);
		return c.json(
			{
				path: c.req.path,
				error: error.status,
			},
			error.statusCode
		);
	}
});
