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
      expressiveCode: {
        // Themes: https://expressive-code.com/guides/themes/
        themes: ["github-dark"],
        // Remove the window frame around code blocks
        styleOverrides: {
          // Frame styles
          frames: {
            frameBoxShadowCssValue: "none",
          },
          // Border radius
          borderRadius: "0.5rem",
          // Code block padding
          codePaddingBlock: "1rem",
          codePaddingInline: "1.25rem",
          // Font settings
          codeFontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          codeFontSize: "0.875rem",
          codeLineHeight: "1.6",
          // Border
          borderColor: "var(--sl-color-gray-5)",
          borderWidth: "1px",
        },
      },
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
            { label: "Public SDK", slug: "docs/api/sdk" },
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
