import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdmin } from "./admin";
import { apiRouteFile } from "./file";

// Main API router
export const apiRoute = new Hono<AppEnv>();
apiRoute.use("*", async (c, next) => {
	c.header("X-API-Version", "1.0.0");
	return next();
});

// Admin routes
apiRoute.route("/admin", apiRouteAdmin);

// File routes
apiRoute.route("/file", apiRouteFile);
