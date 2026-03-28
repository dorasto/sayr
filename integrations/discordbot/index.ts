import { registerIntegration } from "@repo/integrations";
import type { IntegrationManifest } from "@repo/integrations/types";
import { apiRoute } from "./api";
import { questionsPage, settingsPage } from "./ui/pages";

const integration: IntegrationManifest = {
	id: "discordbot",
	name: "Discord Bot",
	version: "1.0.0",
	description: "create tasks from discord with slash commands",
	api: apiRoute,
	ui: {
		pages: {
			settings: settingsPage,
			questions: questionsPage,
		},
		components: {}
	}
};

registerIntegration(integration);

export { integration };
export { apiRoute } from "./api";