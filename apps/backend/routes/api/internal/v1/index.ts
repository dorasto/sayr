import { getEditionCapabilities } from "@repo/edition";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdmin } from "./admin";
import { aiRoute } from "./ai";
import { apiRouteUserApiKeys } from "./apikey";
import { apiRouteConsole } from "./console";
import { apiRouteFile } from "./file";
import { apiRoutePolar } from "./polar";

export const internalApiV1 = new Hono<AppEnv>();
internalApiV1.route("/admin", apiRouteAdmin);
internalApiV1.route("/ai", aiRoute);
internalApiV1.route("/api-keys", apiRouteUserApiKeys);
internalApiV1.route("/file", apiRouteFile);
internalApiV1.route("/console", apiRouteConsole);
const { polarBillingEnabled } = getEditionCapabilities();
if (polarBillingEnabled) {
	internalApiV1.route("/polar", apiRoutePolar);
}
