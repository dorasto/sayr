"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarSubmenu,
} from "@repo/ui/components/doras-ui/sidebar";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
  IconDots,
  IconLayoutSidebar,
  IconLayoutSidebarFilled,
  IconPlus,
  IconSearch,
  IconSettings,
  IconShield,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useLayoutData } from "@/components/generic/Context";
import CreateOrganizationDialog from "@/components/organization/CreateOrganizationDialog";
import { heading, navigation } from "@/lib/routemap";
import { commandActions } from "@/lib/command-store";
import { sidebarActions, sidebarStore } from "@/lib/sidebar/sidebar-store";
import OrgSection from "./primary-org";
import UserDropdown from "./user-dropdown";
import { Kbd } from "@repo/ui/components/kbd";
export function PrimarySidebar() {
  const sidebarId = "primary-sidebar";
  const isMobile = useIsMobile();

  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const pathname =
    rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
  const { account, organizations } = useLayoutData();
  const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);
  const isSidebarOpen = sidebar?.open ?? true;
  const closeMobileSidebar = () => {
    if (isMobile) {
      sidebarActions.setOpen(sidebarId, false, true);
    }
  };
  return (
    <Sidebar id={sidebarId} collapsible keyboardShortcut="b" className="">
      <SidebarHeader className="pb-0">
        {heading.map((section) => (
          <SidebarMenu key={section.title} className="gap-0.5">
            {section.items.map((item) => {
              const isActive = pathname === item.url;
              const IconComponent =
                isActive && item.activeIcon ? item.activeIcon : item.icon;

              return (
                <SidebarMenuItem
                  key={item.title}
                  isActive={isActive}
                  className="min-h-0"
                >
                  <Link className="w-full" to={item.url}>
                    <SidebarMenuButton
                      size="small"
                      tooltip={item.title}
                      icon={<IconComponent size={16} />}
                    >
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        ))}
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((section) => (
          <SidebarGroup key={section.title}>
            {section.title === "Overview" ? null : (
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            )}
            <SidebarMenu className="gap-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.url;
                const IconComponent =
                  isActive && item.activeIcon ? item.activeIcon : item.icon;

                return (
                  <SidebarMenuItem
                    className="min-h-auto"
                    key={item.title}
                    isActive={isActive}
                  >
                    <Link to={item.url} className="w-full">
                      <SidebarMenuButton
                        size="small"
                        icon={<IconComponent size={16} />}
                        tooltip={item.title}
                      >
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        <SidebarGroup>
          <SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>
            Organizations
          </SidebarGroupLabel>

          <SidebarMenu
            className={cn("org-sidebar-menu", isSidebarOpen && "gap-0.5")}
          >
            {organizations
              .flatMap((org) => [
                <OrgSection
                  closeMobileSidebar={closeMobileSidebar}
                  key={org.id}
                  organization={org}
                />,
              ])
              .filter(Boolean)}
            <SidebarMenuItem className="min-h-auto">
              <CreateOrganizationDialog
                trigger={
                  <SidebarMenuButton
                    size="small"
                    tooltip="Create Organization"
                    icon={<IconPlus size={16} />}
                  >
                    <span>Create</span>
                  </SidebarMenuButton>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t-transparent">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem className="min-h-auto">
            <SidebarMenuButton
              size="small"
              tooltip={"Search"}
              icon={<IconSearch />}
              onClick={() => commandActions.open()}
            >
              {" "}
              Search
            </SidebarMenuButton>
            <SidebarMenuSub className="">
              <Kbd>⌘K</Kbd>
            </SidebarMenuSub>
          </SidebarMenuItem>
          <SidebarMenuItem className="min-h-auto">
            <SidebarMenuButton
              size="small"
              tooltip={isSidebarOpen ? "Collapse" : "Expand"}
              onClick={() => sidebarActions.toggleSidebar(sidebarId)}
              icon={
                isSidebarOpen ? (
                  <IconLayoutSidebarFilled />
                ) : (
                  <IconLayoutSidebar />
                )
              }
            >
              {" "}
              {isSidebarOpen ? "Collapse" : "Expand"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          {account.role === "admin" && (
            <SidebarMenuItem className="min-h-auto">
              <Link to={"/admin/console"} className="w-full">
                <SidebarMenuButton
                  size="small"
                  icon={<IconShield />}
                  tooltip="Admin console"
                >
                  Admin console
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem className="min-h-auto">
            <Link to={"/admin/settings"} className="w-full">
              <SidebarMenuButton
                size="small"
                icon={<IconSettings />}
                tooltip="Settings"
              >
                Settings
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <UserDropdown />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
