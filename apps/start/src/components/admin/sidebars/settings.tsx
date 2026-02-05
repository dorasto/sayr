import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
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
  useSidebar,
} from "@repo/ui/components/doras-ui/sidebar";
import {
  ComboBox,
  ComboBoxContent,
  ComboBoxEmpty,
  ComboBoxGroup,
  ComboBoxItem,
  ComboBoxList,
  ComboBoxSearch,
  ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import {
  IconArrowLeft,
  IconChevronDown,
  IconLayoutSidebar,
  IconLayoutSidebarFilled,
  IconUsers,
} from "@tabler/icons-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
import { useLayoutData } from "@/components/generic/Context";
import { navigationStore } from "@/lib/navigation-store";
import { orgSettingsNavigation, settingsNavigation } from "@/lib/routemap";
import { sidebarActions } from "@/lib/sidebar/sidebar-store";
import UserDropdown from "./user-dropdown";

export function SettingsSidebar() {
  const sidebarId = "primary-sidebar"; // Sharing the same ID to maintain state
  const location = useLocation();
  const pathname = location.pathname;
  const { isCollapsed } = useSidebar(sidebarId);
  const isSidebarOpen = !isCollapsed;
  const { organizations } = useLayoutData();
  const isMobile = useIsMobile();
  const lastDashboardRoute = useStore(
    navigationStore,
    (state) => state.lastDashboardRoute,
  );
  const navigate = useNavigate();

  // Determine currently selected org from URL
  const orgIdFromPath = pathname.match(/\/settings\/org\/([^/]+)/)?.[1];
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(
    orgIdFromPath || organizations[0]?.id || null,
  );

  // Extract the sub-path after the orgId (e.g., "/members", "/teams/123")
  const getSubPath = () => {
    if (!orgIdFromPath) return "";
    const match = pathname.match(/\/settings\/org\/[^/]+(\/.*)?$/);
    return match?.[1] || "";
  };

  // Keep selectedOrgId in sync with URL when navigating
  useEffect(() => {
    if (orgIdFromPath && orgIdFromPath !== selectedOrgId) {
      setSelectedOrgId(orgIdFromPath);
    }
  }, [orgIdFromPath, selectedOrgId]);

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId);

  const handleOrgChange = (orgId: string | null) => {
    if (orgId) {
      setSelectedOrgId(orgId);
      // Preserve the current sub-path when switching orgs
      const subPath = getSubPath();
      const newPath = `/settings/org/${orgId}${subPath}`;
      navigate({ to: newPath });
    }
  };

  return (
    <Sidebar id={sidebarId} collapsible keyboardShortcut="b" className="">
      <SidebarHeader className="pb-0">
        <SidebarMenu>
          <SidebarMenuItem className="min-h-auto">
            <Link className="w-full" to={lastDashboardRoute}>
              <SidebarMenuButton
                tooltip="Back to dashboard"
                size="small"
                icon={<IconArrowLeft size={16} />}
              >
                <span>Dashboard</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="flex flex-col gap-3">
        <SidebarGroup>
          <SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>
            Settings
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {settingsNavigation.map((item) => {
              const isActive = pathname === item.url;
              return (
                <SidebarMenuItem
                  key={item.title}
                  isActive={isActive}
                  className="min-h-auto"
                >
                  <Link to={item.url} className="w-full">
                    <SidebarMenuButton
                      size="small"
                      icon={<item.icon size={16} />}
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
        <SidebarGroup className="">
          <SidebarGroupLabel className={cn(isSidebarOpen ? "" : "hidden")}>
            Organizations
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {/* Organization Picker */}
            <ComboBox
              value={selectedOrgId || undefined}
              onValueChange={handleOrgChange}
            >
              <SidebarMenuItem className="min-h-auto">
                <ComboBoxTrigger asChild>
                  <SidebarMenuButton
                    size="small"
                    className="w-full justify-between"
                    icon={
                      selectedOrg ? (
                        <Avatar className="h-3 w-3">
                          <AvatarImage
                            src={
                              selectedOrg.logo
                                ? ensureCdnUrl(selectedOrg.logo)
                                : ""
                            }
                            alt={selectedOrg.name}
                          />
                          <AvatarFallback className="rounded-md uppercase text-xs">
                            <IconUsers className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <IconUsers className="h-3 w-3" />
                      )
                    }
                    tooltip="Select organization"
                  >
                    <span className="truncate flex-1 text-left flex flex-row items-center">
                      {selectedOrg?.name || "Select organization"}
                      <IconChevronDown className="h-3 w-3 shrink-0 text-muted-foreground ml-auto" />
                    </span>
                  </SidebarMenuButton>
                </ComboBoxTrigger>
                <ComboBoxContent align="start" className="">
                  <ComboBoxSearch placeholder="Search organizations..." />
                  <ComboBoxList>
                    <ComboBoxEmpty>No organizations found</ComboBoxEmpty>
                    <ComboBoxGroup>
                      {organizations.map((org) => (
                        <ComboBoxItem
                          key={org.id}
                          value={org.id}
                          searchValue={`${org.name} ${org.slug}`}
                          showCheck={false}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-4 w-4">
                              <AvatarImage
                                src={org.logo ? ensureCdnUrl(org.logo) : ""}
                                alt={org.name}
                              />
                              <AvatarFallback className="rounded-md uppercase text-xs">
                                <IconUsers className="h-3 w-3" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{org.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground font-mono">
                              {org.slug}
                            </span>
                          </div>
                        </ComboBoxItem>
                      ))}
                    </ComboBoxGroup>
                  </ComboBoxList>
                </ComboBoxContent>
              </SidebarMenuItem>
            </ComboBox>

            {/* Selected org's navigation items */}
            {selectedOrg && (
              <SidebarGroup className="ml-2 pl-2 border-l mt-1">
                {orgSettingsNavigation.map((item) => {
                  const baseUrl = `/settings/org/${selectedOrg.id}`;
                  const url = item.slug ? `${baseUrl}/${item.slug}` : baseUrl;
                  const isActive =
                    item.matchType === "includes"
                      ? pathname.includes(url) && pathname !== baseUrl
                      : pathname === url;
                  const Icon = isActive ? item.activeIcon : item.icon;
                  return (
                    <SidebarMenuItem
                      key={item.title}
                      hideWhenCollapsed
                      className="min-h-auto"
                      isActive={isActive}
                    >
                      <Link to={url} className="w-full">
                        <SidebarMenuButton
                          size="small"
                          icon={
                            <Icon
                              className={cn(isActive && item.activeClass)}
                            />
                          }
                          tooltip={item.title}
                        >
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarGroup>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t-transparent">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem className="">
            <SidebarMenuButton
              size="small"
              onClick={() =>
                isMobile
                  ? sidebarActions.toggleSidebar(sidebarId, true)
                  : sidebarActions.toggleSidebar(sidebarId)
              }
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
          <UserDropdown />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
