// @ts-check

import node from "@astrojs/node";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import starlightOpenAPI, { openAPISidebarGroups } from "starlight-openapi";

// https://astro.build/config
export default defineConfig({
  site: "https://sayr.io",
  output: "server",
  adapter: node({
    mode: "standalone",
  }),

  integrations: [
    starlight({
      title: "Sayr Docs",
      logo: { src: "./src/assets/logo.svg" },

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
            { label: "Introduction", slug: "docs/introduction" },
            { label: "Quick Start", slug: "docs/quick-start" },
          ],
        },
        {
          label: "Guides",
          items: [
            { label: "Visibility Controls", slug: "docs/guides/visibility" },
          ],
        },

        ...openAPISidebarGroups,
      ],
      plugins: [
        starlightOpenAPI([
          {
            base: "api",
            schema: "https://sayr.io/api/public/openapi.json",
            sidebar: {
              label: "API Reference",
              collapsed: false,
              operations: {
                badges: true,
                labels: "summary",
              },
            },
          },
        ]),
      ],
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
