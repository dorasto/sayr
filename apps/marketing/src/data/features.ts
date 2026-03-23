/**
 * Single source of truth for all feature page metadata.
 *
 * Used by:
 *  - navigationbar.tsx       (title, navDesc, icon, href)
 *  - pages/features/[slug].astro  (all fields)
 *  - RelatedFeatures.astro   (title, navDesc, icon, href)
 *
 * Fields
 * ------
 * slug          - matches the MDX filename (without .mdx) and the URL segment
 * title         - full feature name (used in <title> and page h1)
 * navDesc       - one-liner shown in the navbar dropdown and related-features cards
 * icon          - Tabler icon component, e.g. IconLayoutKanban
 * headerImage   - optional path relative to src/assets/, e.g. "features/tasks.png"
 *                 rendered as the hero header image and used as the OG image
 * heroHeadline  - large h1 text on the feature page hero
 * heroSubcopy   - paragraph below the h1
 * description   - <meta description> / OG description (keep ≤ 160 chars)
 * related       - slugs of up to 3 related feature pages shown at the bottom
 */

import type { ComponentType } from "react";
import {
  IconLayoutBoard,
  IconEye,
  IconBrandGithub,
  IconLayoutKanban,
  IconArrowBigUp,
  IconServer,
} from "@tabler/icons-react";

export interface DocLink {
  label: string;
  href: string;
}

export interface FeatureMeta {
  slug: string;
  title: string;
  navDesc: string;
  icon: ComponentType<{ size?: number; className?: string; stroke?: number }>;
  headerImage?: string;
  heroHeadline: string;
  heroSubcopy: string;
  description: string;
  related?: string[];
  /** Links to relevant documentation pages shown on the feature page. */
  docs?: DocLink[];
}

export const FEATURES: FeatureMeta[] = [
  {
    slug: "public-portal",
    title: "Public Portal",
    navDesc: "Live public board for your users",
    icon: IconLayoutBoard,
    heroHeadline: "Your roadmap, live for the world to see",
    heroSubcopy:
      "Give your users a real-time window into what you're working on. The public portal surfaces the tasks you choose to share — by status, category, or release — without exposing anything internal.",
    description:
      "A live public board that lets users see your roadmap, submit feedback, and vote on what matters most — all without giving them access to your internal workspace.",
    related: ["visibility", "voting", "tasks"],
    docs: [
      { label: "Public pages overview", href: "/docs/visibility/public-pages" },
    ],
    headerImage:
      "https://cdn.doras.to/doras/assets/c7375a64-aed1-48e4-9973-cb4e73337eec/022efab1-7ab5-4712-a7eb-3831c60b8e20.png",
  },
  {
    slug: "visibility",
    title: "Visibility Control",
    navDesc: "Share what you want, hide the rest",
    icon: IconEye,
    heroHeadline: "Granular visibility, zero configuration",
    heroSubcopy:
      "Every task, label, comment, and timeline entry in Sayr carries its own visibility setting. Share progress with users without ever worrying about leaking internal context.",
    description:
      "Per-item visibility controls let you decide exactly what users see on your public portal — individual tasks, labels, comments, and timeline events can each be public or private.",
    related: ["public-portal", "tasks", "github"],
    docs: [{ label: "Visibility overview", href: "/docs/visibility/overview" }],
  },
  {
    slug: "github",
    title: "GitHub Integration",
    navDesc: "Sync issues, branches, and PRs",
    icon: IconBrandGithub,
    heroHeadline: "Close the loop between code and customers",
    heroSubcopy:
      "Connect Sayr tasks to GitHub issues, branches, and pull requests. When a PR merges, the task moves. When a release ships, users know automatically.",
    description:
      "Two-way GitHub sync links Sayr tasks to issues, branches, and pull requests. Automate status transitions on merge and keep your public portal in sync with your actual releases.",
    related: ["tasks", "visibility", "public-portal"],
    docs: [{ label: "GitHub integration", href: "/docs/integrations/github" }],
  },
  {
    slug: "tasks",
    title: "Task Management",
    navDesc: "Kanban, lists, subtasks, releases",
    icon: IconLayoutKanban,
    heroHeadline: "Project management that doesn't get in your way",
    heroSubcopy:
      "Sayr gives your team a complete task management system — kanban and list views, rich-text descriptions, subtasks, task relations, labels, categories, releases, and a full audit timeline. Everything you need, nothing you don't.",
    description:
      "Full-featured project management with statuses, priorities, assignees, labels, categories, releases, and multiple views — built to work alongside a live public portal.",
    related: ["github", "visibility", "voting"],
    docs: [{ label: "Tasks", href: "/docs/tasks/tasks" }],
  },
  {
    slug: "voting",
    title: "User Voting",
    navDesc: "Let users prioritize your roadmap",
    icon: IconArrowBigUp,
    heroHeadline: "Build what your users actually want",
    heroSubcopy:
      "Let users upvote the tasks and features that matter most to them. Every vote surfaces signal your team can act on — no spreadsheets, no surveys, no guesswork.",
    description:
      "Public voting lets your users upvote tasks and features, giving your team a clear signal of what to prioritize next without any manual aggregation.",
    related: ["public-portal", "visibility", "tasks"],
    docs: [{ label: "Public pages", href: "/docs/visibility/public-pages" }],
  },
  {
    slug: "self-hosting",
    title: "Self-Hosting",
    navDesc: "Your data on your infrastructure",
    icon: IconServer,
    heroHeadline: "Full control over where your data lives",
    heroSubcopy:
      "Run Sayr on your own servers with Docker Compose in minutes. Community edition is free forever. Enterprise edition adds SSO, audit logs, and priority support.",
    description:
      "Self-host Sayr on your own infrastructure with Docker Compose. Community edition is free and open; Enterprise adds SSO, advanced audit logs, and SLA-backed support.",
    related: ["visibility", "tasks", "github"],
    docs: [{ label: "Get started", href: "/docs/self-hosting/get-started" }],
  },
];

/** Look up a single feature by slug — returns undefined if not found. */
export function getFeature(slug: string): FeatureMeta | undefined {
  return FEATURES.find((f) => f.slug === slug);
}

/** The subset of fields the navbar and related-feature cards need. */
export const NAV_FEATURES = FEATURES.map(({ slug, title, navDesc, icon }) => ({
  title,
  navDesc,
  icon,
  href: `/features/${slug}`,
}));
