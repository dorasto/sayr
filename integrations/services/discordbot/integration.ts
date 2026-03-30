import type { IntegrationManifest } from "@repo/integrations/types";
import { apiRoute } from "./api";
import { templatesPage, settingsPage } from "./ui/pages";
import { docs } from "./docs";
import { registerIntegration } from "@repo/integrations";
const ID = "discordbot";
const integration: IntegrationManifest = {
  id: ID,
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
  author: {
    name: "Doras Media Ltd",
    url: "https://github.com/dorasto"
  },
  requiresExternalService: false,
  externalServiceNote: "You must host and run the bot process separately. Use the provided Dockerfile for easy deployment."
};

registerIntegration(integration);
export { integration };
export { apiRoute } from "./api";
