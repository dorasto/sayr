import * as Icon from "@tabler/icons-react";
export const heading = [
  {
    title: "Overview",
    icon: Icon.IconLayoutGrid,
    items: [
      {
        title: "Dashboard",
        url: "/admin",
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
        url: "/admin/mine",
        icon: Icon.IconChecklist,
        activeIcon: Icon.IconChecklist,
      },
    ],
  },
];

// Settings navigation items for account-level settings
export const settingsNavigation = [
  {
    title: "Account",
    slug: "",
    url: "/admin/settings",
    icon: Icon.IconUser,
    activeIcon: Icon.IconUser,
    matchType: "exact" as const,
  },
  {
    title: "Connections",
    slug: "connections",
    url: "/admin/settings/connections",
    icon: Icon.IconHttpConnect,
    activeIcon: Icon.IconHttpConnect,
    matchType: "exact" as const,
  },
];

// Organization settings sub-items (used when viewing org settings)
export const orgSettingsNavigation = [
  {
    title: "General",
    slug: "",
    icon: Icon.IconSettings,
    activeIcon: Icon.IconSettings,
    activeClass: "",
    matchType: "exact" as const,
  },
  {
    title: "Connections",
    slug: "connections",
    icon: Icon.IconPlug,
    activeIcon: Icon.IconPlug,
    activeClass: "fill-white",
    matchType: "includes" as const,
  },
  {
    title: "Members",
    slug: "members",
    icon: Icon.IconUsers,
    activeIcon: Icon.IconUsers,
    activeClass: "fill-white",
    matchType: "exact" as const,
  },
  {
    title: "Teams",
    slug: "teams",
    icon: Icon.IconUsersGroup,
    activeIcon: Icon.IconUsersGroup,
    activeClass: "fill-white",
    matchType: "exact" as const,
  },
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
    title: "Views",
    slug: "views",
    icon: Icon.IconStack2,
    activeIcon: Icon.IconStack2Filled,
    activeClass: "",
    matchType: "includes" as const,
  },
];
