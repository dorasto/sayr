import node from "@astrojs/node";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { ion } from "starlight-ion-theme";
import starlightPageActions from "starlight-page-actions";
import starlightSidebarTopics from "starlight-sidebar-topics";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { precomputeContributors } from "./src/integrations/precompute-contributors.ts";
// https://astro.build/config
export default defineConfig({
  site: "https://sayr.io",
  output: "server",
  adapter: node({
    mode: "standalone",
  }),

  integrations: [
    precomputeContributors(),
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
        {
          icon: "right-arrow",
          label: "Login",
          href: "https://admin.sayr.io/auth/login",
        },
      ],
      customCss: ["./src/styles/custom.css"],
      components: {
        PageTitle: "./src/components/overrides/PageTitle.astro",
        LastUpdated: "./src/components/overrides/LastUpdated.astro",
        TableOfContents: "./src/components/overrides/TableOfContents.astro",
        MarkdownContent: "./src/components/overrides/MarkdownContent.astro",
      },
      plugins: [
        starlightSidebarTopics([
          {
            label: "Documentation",
            link: "/docs/",
            icon: "open-book",
            id: "docs",
            items: [
              {
                label: "Getting Started",
                items: [
                  { label: "Introduction", slug: "docs" },
                  { label: "Quick Start", slug: "docs/quick-start" },
                ],
              },
              {
                label: "Tasks",
                autogenerate: { directory: "/docs/tasks" },
                collapsed: true,
              },
              {
                label: "Organize",
                autogenerate: { directory: "/docs/organize" },
                collapsed: true,
              },
              {
                label: "Visibility & Pages",
                autogenerate: { directory: "/docs/visibility" },
                collapsed: true,
              },
              {
                label: "Account",
                autogenerate: { directory: "/docs/account" },
                collapsed: true,
              },
              {
                label: "Organizations",
                autogenerate: { directory: "/docs/organizations" },
                collapsed: true,
              },
              {
                label: "Integrations",
                autogenerate: { directory: "/docs/integrations" },
                collapsed: true,
              },

              {
                label: "Self Hosting",
                autogenerate: { directory: "/docs/self-hosting" },
                collapsed: true,
              },
              {
                label: "Contributing",
                autogenerate: { directory: "/docs/contributing" },
                collapsed: true,
              },
            ],
          },
          {
            label: "API",
            link: "/docs/api/overview/",
            icon: "puzzle",
            id: "api",
            items: [
              {
                label: "API Reference",
                autogenerate: { directory: "/docs/api" },
              },
            ],
          },
          {
            label: "Knowledge Base",
            link: "/docs/knowledge-base/",
            icon: "information",
            id: "kb",
            items: [
              {
                label: "Help",
                autogenerate: { directory: "/docs/knowledge-base" },
              },
            ],
          },
        ]),
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
