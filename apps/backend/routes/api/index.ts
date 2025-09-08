import type { auth } from "@repo/auth";
import { Hono } from "hono";
import { apiRouteAdmin } from "./admin";

export const apiRoute = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();
apiRoute.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	return next();
});
apiRoute.route("/admin", apiRouteAdmin);
