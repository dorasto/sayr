import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdmin } from "./admin";
import { apiRouteFile } from "./file";
import { apiRouteConsole } from "./console";
import { apiRoutePolar } from "./polar";
import { aiRoute } from "./ai";
import { getEditionCapabilities } from "@repo/edition";

export const internalApiV1 = new Hono<AppEnv>();
internalApiV1.route("/admin", apiRouteAdmin);
internalApiV1.route("/ai", aiRoute);
internalApiV1.route("/file", apiRouteFile);
internalApiV1.route("/console", apiRouteConsole);
const { polarBillingEnabled } = getEditionCapabilities()
if (polarBillingEnabled) {
    internalApiV1.route("/polar", apiRoutePolar);
}