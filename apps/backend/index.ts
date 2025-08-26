import { auth } from "@repo/auth/index";
import { Hono } from "hono";
import { serveStatic, websocket } from "hono/bun"; // Or 'hono/bun' for Bun
import { cors } from "hono/cors";
import { wsRoute } from "./routes/ws";

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
}>();
app.use(
	"*",
	cors({
		origin: [process.env.NEXT_PUBLIC_URL_ROOT as string, process.env.NEXT_PUBLIC_API_SERVER as string],
		allowHeaders: [],
		allowMethods: ["POST", "GET", "PATCH", "OPTIONS"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		maxAge: 600,
		credentials: true,
	})
);
app.use("*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		return next();
	}
	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});
app.get("/", serveStatic({ path: "./public/index.html" }));
app.route("/", wsRoute);
app.get("/ws", serveStatic({ path: "./public/ws.html" }));
export default {
	port: 5468,
	fetch: app.fetch,
	websocket,
};
