import type { IntegrationManifest } from "@repo/integrations/types";
import { apiRoute } from "./api/index";
import { settingsPage, itemsPage, syncPage } from "./ui/pages";
import { docs } from "./docs";
import { registerIntegration } from "@repo/integrations";

const ID = "{{id}}";

const integration: IntegrationManifest = {
  id: ID,
  name: "{{name}}",
  version: "1.0.0",
  description: "{{description}}",
  icon: "IconApi",
  docs,
  api: apiRoute,
  ui: {
    pages: {
      settings: settingsPage,
      items: itemsPage,
      sync: syncPage,
    },
    components: {},
  },
  author: {
    name: "{{author}}",
  },
  requiresExternalService: false,
};

registerIntegration(integration);
export { integration };
export { apiRoute } from "./api/index";