import { registerIntegration } from "@repo/integrations";
import type { IntegrationManifest } from "@repo/integrations/types";
import { apiRoute } from "./api";
import { templatesPage, settingsPage } from "./ui/pages";
import { docs } from "./docs";

const integration: IntegrationManifest = {
  id: "discordbot",
  name: "Discord Bot",
  version: "1.0.0",
  description: "Create tasks from Discord with slash commands",
  icon: "IconBrandDiscord",
  docs,
  api: apiRoute,
  ui: {
    pages: {
      settings: settingsPage,
      templates: templatesPage,
    },
    components: {},
  },
};

registerIntegration(integration);

export { integration };
export { apiRoute } from "./api";
