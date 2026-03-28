import { registerIntegration } from "@repo/integrations";
import type { IntegrationManifest } from "@repo/integrations/types";
import { apiRoute } from "./api";
import { questionsPage, settingsPage } from "./ui/pages";

const integration: IntegrationManifest = {
  id: "discordbot",
  name: "Discord Bot",
  version: "1.0.0",
  description: "Create tasks from Discord with slash commands",
  icon: "IconBrandDiscord",
  api: apiRoute,
  ui: {
    pages: {
      settings: settingsPage,
      questions: questionsPage,
    },
    components: {},
  },
};

registerIntegration(integration);

export { integration };
export { apiRoute } from "./api";
