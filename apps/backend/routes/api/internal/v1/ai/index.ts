import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { summarizeTaskRoute } from "./summarize-task";
import { taskSummaryStatusRoute } from "./task-summary-status";
import { suggestLabelsRoute } from "./suggest-labels";
import { releaseNotesRoute } from "./release-notes";

export const aiRoute = new Hono<AppEnv>();

aiRoute.route("/summarize-task", summarizeTaskRoute);
aiRoute.route("/task-summary-status", taskSummaryStatusRoute);
aiRoute.route("/suggest-labels", suggestLabelsRoute);
aiRoute.route("/release-notes", releaseNotesRoute);
