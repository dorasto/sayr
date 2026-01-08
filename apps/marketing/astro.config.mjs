// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://sayr.io",

  integrations: [starlight({
    title: "Sayr Docs",
    description:
      "Documentation for Sayr.io - Transparent, collaborative project management",
    social: [
      {
        icon: "github",
        label: "GitHub",
        href: "https://github.com/sayr-io/sayr",
      },
    ],
    sidebar: [
      {
        label: "Getting Started",
        items: [
          { label: "Introduction", slug: "introduction" },
          { label: "Quick Start", slug: "quick-start" },
        ],
      },
      {
        label: "Guides",
        items: [{ label: "Visibility Controls", slug: "guides/visibility" }],
      },
      {
        label: "API Reference",
        items: [{ label: "Overview", slug: "api/overview" }],
      },
    ],
    // customCss: ["./src/styles/custom.css"],
  }), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});