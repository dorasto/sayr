import { auth } from "@repo/auth";
// import { auth as authType, db } from "@repo/database";
// import { eq } from "drizzle-orm";
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
		const startNew = Date.now();

		const result = await auth.api.updateOrganization({
			body: {
				data,
				organizationId: org_id,
			},
			headers: c.req.raw.headers,
		});
		console.log("updateOrganization fetch took", Date.now() - startNew, "ms");

		if (result) {
			const found = findClientByWsId(wsClientId);
			broadcast(org_id, "admin", { type: "UPDATE_ORG", data: result }, found?.socket);
			return c.json({ success: true, data: result });
		}
		return c.json({ error: "UNAUTHORIZED" }, 401);
		// biome-ignore lint/suspicious/noExplicitAny: <has to be any>
	} catch (error: any) {
		console.log("🚀 ~ error:", error);
		return c.json(
			{
				error: error.status,
			},
			error.statusCode
		);
	}
});
