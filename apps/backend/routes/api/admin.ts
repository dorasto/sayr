import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdminOrganization } from "./organization";

export const apiRouteAdmin = new Hono<AppEnv>();

apiRouteAdmin.route("/organization", apiRouteAdminOrganization);
