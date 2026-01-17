import node from "@astrojs/node";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { ion } from "starlight-ion-theme";
import starlightPageActions from "starlight-page-actions";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://sayr.io",
  output: "server",
  adapter: node({
    mode: "standalone",
  }),

  integrations: [
    starlight({
      title: "Sayr",
      logo: { src: "./src/assets/logo.svg" },
      lastUpdated: true,
      editLink: {
        baseUrl: "https://github.com/dorasto/sayr/edit/main/apps/marketing/",
      },
      routeMiddleware: "./src/routeData/contributors.ts",
      description:
        "Documentation for Sayr.io - Transparent, collaborative project management",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/dorasto/sayr",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "docs" },
            { label: "Quick Start", slug: "docs/quick-start" },
          ],
        },

        {
          label: "Guides",
          autogenerate: { directory: "/docs/guides" },
        },
        {
          label: "API",
          items: [
            { label: "Overview", slug: "docs/api/overview" },
            { label: "WebSocket", slug: "docs/api/ws" },
            { label: "API Reference", slug: "docs/api/reference" },
          ],
        },
        {
          label: "Self hosting",
          autogenerate: { directory: "/docs/self-hosting" },
        },
      ],
      customCss: ["./src/styles/custom.css"],
      components: {
        PageTitle: "./src/components/overrides/PageTitle.astro",
        LastUpdated: "./src/components/overrides/LastUpdated.astro",
        TableOfContents: "./src/components/overrides/TableOfContents.astro",
      },
      plugins: [
        starlightPageActions({
          baseUrl: "https://sayr.io",
          actions: {
            chatgpt: true,
            claude: true,
            viewMarkdown: true,
            t3chat: true,
            copyMarkdown: true,
          },
        }),
        // ion(),
      ],
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
