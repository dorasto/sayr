import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { recommendationsRoute } from "./recommendations";
import { releaseNotesRoute } from "./release-notes";
import { summarizeTaskRoute } from "./summarize-task";
import { taskSummaryStatusRoute } from "./task-summary-status";

export const aiRoute = new Hono<AppEnv>();

aiRoute.route("/summarize-task", summarizeTaskRoute);
aiRoute.route("/task-summary-status", taskSummaryStatusRoute);
aiRoute.route("/recommendations", recommendationsRoute);
aiRoute.route("/release-notes", releaseNotesRoute);
