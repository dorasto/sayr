import type React from "react";
import * as Icon from "@tabler/icons-react";
export const heading = [
  {
    title: "Overview",
    icon: Icon.IconLayoutGrid,
    items: [
      {
        title: "Dashboard",
        url: "/home",
        icon: Icon.IconHome,
        activeIcon: Icon.IconHomeFilled,
      },
    ],
  },
];
export const navigation = [
  {
    title: "Overview",
    icon: Icon.IconLayoutGrid,
    items: [
      {
        title: "My Tasks",
        url: "/mine",
        icon: Icon.IconChecklist,
        activeIcon: Icon.IconChecklist,
      },
      {
        title: "Inbox",
        url: "/inbox",
        icon: Icon.IconNotification,
        activeIcon: Icon.IconNotification,
      },
    ],
  },
];

// Settings navigation items for account-level settings
export const settingsNavigation = [
  {
    title: "Account",
    slug: "",
    url: "/settings",
    icon: Icon.IconUser,
    activeIcon: Icon.IconUser,
    activeClass: "fill-white",
    matchType: "exact" as const,
  },
  {
    title: "Security",
    slug: "security",
    url: "/settings/security",
    icon: Icon.IconShieldCheck,
    activeIcon: Icon.IconShieldCheck,
    activeClass: "fill-white",
    matchType: "exact" as const,
  },
  {
    title: "Connections",
    slug: "connections",
    url: "/settings/connections",
    icon: Icon.IconPlug,
    activeIcon: Icon.IconPlug,
    activeClass: "fill-white",
    matchType: "exact" as const,
  },
];

export type OrgSettingsNavLabel = {
  label: string;
  cloudOnly?: boolean;
};

export type OrgSettingsNavItem = {
  title: string;
  slug: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  activeIcon: React.ComponentType<{ size?: number; className?: string }>;
  activeClass: string;
  matchType: "exact" | "includes";
  cloudOnly?: boolean;
  /** Show only when AI is enabled on this instance (runtime check). */
  aiOnly?: boolean;
};

export type OrgSettingsNavEntry = OrgSettingsNavItem | OrgSettingsNavLabel;

// Organization settings sub-items (used when viewing org settings)
const _orgSettingsNavigation: OrgSettingsNavEntry[] = [
  { label: "Administration" },
  {
    title: "General",
    slug: "",
    icon: Icon.IconSettings,
    activeIcon: Icon.IconSettingsFilled,
    activeClass: "",
    matchType: "exact" as const,
  },
  {
    title: "Members",
    slug: "members",
    icon: Icon.IconUsers,
    activeIcon: Icon.IconUsers,
    activeClass: "fill-white",
    matchType: "includes" as const,
  },
  {
    title: "Teams",
    slug: "teams",
    icon: Icon.IconUsersGroup,
    activeIcon: Icon.IconUsersGroup,
    activeClass: "fill-white",
    matchType: "includes" as const,
  },
  {
    title: "Billing",
    slug: "billing",
    icon: Icon.IconCreditCard,
    activeIcon: Icon.IconCreditCardFilled,
    activeClass: "",
    matchType: "exact" as const,
    cloudOnly: true,
  },
  { label: "Features" },
  {
    title: "Connections",
    slug: "connections",
    icon: Icon.IconPlug,
    activeIcon: Icon.IconPlug,
    activeClass: "fill-white",
    matchType: "includes" as const,
  },
  {
    title: "AI",
    slug: "ai",
    icon: Icon.IconSparkles,
    activeIcon: Icon.IconSparkles,
    activeClass: "fill-primary text-primary",
    matchType: "exact" as const,
    aiOnly: true,
  },

  { label: "Customization" },
  {
    title: "Labels",
    slug: "labels",
    icon: Icon.IconTag,
    activeIcon: Icon.IconTagFilled,
    activeClass: "",
    matchType: "exact" as const,
  },
  {
    title: "Categories",
    slug: "categories",
    icon: Icon.IconCategory,
    activeIcon: Icon.IconCategoryFilled,
    activeClass: "",
    matchType: "exact" as const,
  },
  {
    title: "Templates",
    slug: "templates",
    icon: Icon.IconTemplate,
    activeIcon: Icon.IconTemplate,
    activeClass: "",
    matchType: "exact" as const,
  },
  {
    title: "Views",
    slug: "views",
    icon: Icon.IconStack2,
    activeIcon: Icon.IconStack2Filled,
    activeClass: "",
    matchType: "includes" as const,
  },
];

const edition = import.meta.env.VITE_SAYR_EDITION ?? "community";
const isCloud = edition === "cloud";

export const orgSettingsNavigation = _orgSettingsNavigation.filter((entry) => {
  if (!("cloudOnly" in entry && entry.cloudOnly) || isCloud) {
    // aiOnly items are kept in the list; runtime filtering happens in consuming components
    return true;
  }
  return false;
});
