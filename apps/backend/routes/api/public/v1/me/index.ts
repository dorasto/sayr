import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { requireApiKey } from "../../../../../lib/apiKeyAuth";
import { categoriesRoute } from "./categories";
import { commentsRoute } from "./comments";
import { labelsRoute } from "./labels";
import { profileRoute } from "./profile";
import { releaseCommentsRoute } from "./release-comments";
import { releaseGithubPrsRoute } from "./release-github-prs";
import { releaseLabelsRoute } from "./release-labels";
import { releaseStatusUpdatesRoute } from "./release-status-updates";
import { releasesRoute } from "./releases";
import { tasksRoute } from "./tasks";

/**
 * `/v1/me/*` — authenticated with a personal (or legacy system) API key.
 * Split from a single ~1000-line `me.ts` into per-concern files; every route
 * here requires a valid key via `requireApiKey()`, mounted once for the whole
 * router rather than per-handler.
 */
export const Route = new Hono<AppEnv>();

Route.use("*", requireApiKey());

Route.route("/", profileRoute);
Route.route("/", tasksRoute);
Route.route("/", commentsRoute);
Route.route("/", categoriesRoute);
Route.route("/", releasesRoute);
Route.route("/", releaseLabelsRoute);
Route.route("/", releaseStatusUpdatesRoute);
Route.route("/", releaseCommentsRoute);
Route.route("/", releaseGithubPrsRoute);
Route.route("/", labelsRoute);
