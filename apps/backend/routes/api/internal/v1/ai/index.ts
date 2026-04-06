import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { summarizeTaskRoute } from "./summarize-task";
import { taskSummaryStatusRoute } from "./task-summary-status";

export const aiRoute = new Hono<AppEnv>();

aiRoute.route("/summarize-task", summarizeTaskRoute);
aiRoute.route("/task-summary-status", taskSummaryStatusRoute);

// Future AI routes mount here, e.g.:
// aiRoute.route("/suggest-labels", suggestLabelsRoute);
// aiRoute.route("/release-notes", releaseNotesRoute);
