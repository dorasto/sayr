import { auth } from "@repo/auth/index";
import { Hono } from "hono";
import { serveStatic, websocket } from "hono/bun"; // Or 'hono/bun' for Bun
import { cors } from "hono/cors";
// import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { apiRoute } from "./routes/api";
import { wsRoute } from "./routes/ws";
export type AppEnv = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
};

const app = new Hono<AppEnv>();
// app.use(logger());
app.use(
	"*",
	cors({
		origin: [process.env.NEXT_PUBLIC_URL_ROOT as string, process.env.NEXT_PUBLIC_API_SERVER as string],
		allowHeaders: [],
		allowMethods: ["POST", "GET", "PATCH", "PUT"],
		exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
		maxAge: 600,
		credentials: true,
	})
);

app.get("/health", (c) => c.text("OK"));
app.use("*", requestId());
app.use("*", async (c, next) => {
	c.header("X-Service-Name", "Sayr.io");
	c.header("X-Organization-Name", "Doras Media Limited");
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		return next();
	}
	c.set("user", session.user);
	c.set("session", session.session);
	return next();
});
app.get("/", serveStatic({ path: "./public/index.html" }));
app.route("/ws", wsRoute);
app.route("/api", apiRoute);
app.get("/ws", serveStatic({ path: "./public/ws.html" }));
app.all("*", (c) => {
	const responseBody = generateNotFoundResponse(c.req.method, c.req.path);
	return c.json(responseBody, 404);
});
app.onError((err, c) => {
	const path = c.req.path;
	const method = c.req.method;
	console.error(`🚨 Error in [${method} ${path}] \n`, err);
	// Respond to client with minimal info
	return c.json(
		{
			success: false,
			error: err.cause?.toString() ?? err.toString(),
			path,
			method,
		},
		500
	);
});
export default {
	port: 5468,
	fetch: app.fetch,
	websocket,
	idleTimeout: 20, // seconds (default is 10)
};

const generateNotFoundResponse = (method: string, url: string) => ({
	message: `Route ${method}:${url} not found`,
	error: "Not Found",
	status: 404,
});
