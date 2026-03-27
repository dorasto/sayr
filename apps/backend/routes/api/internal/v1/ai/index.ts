import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { summarizeTaskRoute } from "./summarize-task";

export const aiRoute = new Hono<AppEnv>();

aiRoute.route("/summarize-task", summarizeTaskRoute);

// Future AI routes mount here, e.g.:
// aiRoute.route("/suggest-labels", suggestLabelsRoute);
// aiRoute.route("/release-notes", releaseNotesRoute);
