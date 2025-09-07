import type { auth } from "@repo/auth";
import { Hono } from "hono";
import { broadcast, findClientByWsId } from "./ws";

export const apiRoute = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
		organization: typeof auth.$Infer.Organization | null;
	};
}>();
apiRoute.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	return next();
});
apiRoute.get("/testing-shit/:id", async (c) => {
	const { id } = c.req.param();
	const found = findClientByWsId(id);
	broadcast("org_123", "public", { type: "MESSAGE", data: { text: "Hello from backend" } }, found?.socket);
	return c.json({ ok: true });
});
