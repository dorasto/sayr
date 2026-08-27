import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/**
 * Shared layout options between the docs layout and any other places that
 * need Fumadocs UI (e.g. a search dialog outside `/docs`). Mirrors
 * apps/marketing's 3-topic sidebar (Documentation / API / Knowledge Base) —
 * see astro.config.mjs's `starlightSidebarTopics` for the source of truth
 * this was ported from.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Sayr",
      transparentMode: "top",
    },
    githubUrl: "https://github.com/dorasto/sayr",
  };
}

export const docsTabs = [
  {
    title: "Documentation",
    description: "Guides and references",
    url: "/docs",
  },
  {
    title: "API",
    description: "REST API reference",
    url: "/docs/api",
  },
  {
    title: "Knowledge Base",
    description: "Common questions answered",
    url: "/docs/knowledge-base",
  },
];
