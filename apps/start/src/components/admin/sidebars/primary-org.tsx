"use client";
import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@repo/ui/components/doras-ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import {
  IconChevronRight,
  IconDots,
  IconProgress,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { Link, useLocation, useRouterState } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { sidebarStore } from "@/lib/sidebar/sidebar-store";
import { orgSettingsNavigation } from "@/lib/routemap";

// import UpdateOrgDialog from "@/app/components/admin/global/org/management/update/edit-org-dialog"; // TODO: Port this
// import { useUpdateOrgDialog } from "@/app/hooks/use-update-org-dialog"; // TODO: Port this

interface OrgSectionProps {
  organization: schema.OrganizationWithMembers;
  closeMobileSidebar: () => void;
}

export default function OrgSection({
  organization,
  closeMobileSidebar,
}: OrgSectionProps) {
  const isMobile = useIsMobile();
  // new sidebar
  const sidebarId = "primary-sidebar";
  const sidebar = useStore(sidebarStore, (state) => state.sidebars[sidebarId]);
  const isSidebarOpen = sidebar?.open ?? true;

  // legacy
  // const { isOpen: isDialogOpen, openDialog, setIsOpen } = useUpdateOrgDialog();
  // const { value: isOpen } = useLocalStorage("left-sidebar-state", !isMobile);
  const [editOpen, setEditOpen] = useState(false);
  const location = useLocation();
  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const pathname =
    rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
  const isActive = pathname.includes(`/admin/${organization.id}`);
  const [collapsibleOpen, setCollapsibleOpen] = useState(
    pathname.includes(`/admin/${organization.id}`),
  );
  const [dropdownSettingsOpen, setDropdownSettingsOpen] = useState(
    pathname.includes(`/admin/settings/org/${organization.id}`),
  );
  const closeMobileSidebarOnClick = () => {
    if (isMobile) {
      closeMobileSidebar();
    }
  };

  const orgSubItems = orgSettingsNavigation.filter((item) => item.slug !== "");

  // Desktop + Sidebar Open: Collapsible with full content
  const renderCollapsibleView = () => (
    <>
      <Collapsible
        key={organization.id}
        open={collapsibleOpen}
        onOpenChange={setCollapsibleOpen}
        className={cn("group/collapsible flex flex-col gap-0.5")}
      >
        <SidebarMenuItem
          // key={item.title}
          isActive={pathname === `/admin/${organization.id}`}
          className="min-h-auto group/coltrig"
        >
          <Link
            to={`/admin/$orgId`}
            params={{ orgId: organization.id }}
            className="w-full cursor-pointer"
            onClick={() => {
              setCollapsibleOpen(true);
              closeMobileSidebarOnClick();
            }}
          >
            <SidebarMenuButton
              size="small"
              className="w-full"
              icon={
                <CollapsibleTrigger
                  asChild
                  className="group/trigger data-[state=open]:group-data-[state=open]/trigger:rotate-180 cursor-pointer text-sidebar-foreground"
                >
                  {/** biome-ignore lint/a11y/noStaticElementInteractions: required for dropdown */}
                  {/** biome-ignore lint/a11y/useKeyWithClickEvents: required for dropdown */}
                  <div
                    className="h-3 w-3 aspect-square relative flex items-center justify-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCollapsibleOpen((prev) => !prev);
                    }}
                  >
                    <IconChevronRight className="absolute inset-0 h-3 w-3 bg-transparent text-transparent hover:bg-border group-hover/coltrig:bg-sidebar-accent group-hover/coltrig:text-sidebar-foreground duration-200 group-data-[state=open]/trigger:rotate-90 transition-transform z-20 rounded-md" />
                    <Avatar className="h-3 w-3 rounded-md absolute inset-0 duration-200 transition-none select-none group-hover/coltrig:h-0 bg-accent">
                      <AvatarImage
                        src={organization.logo || ""}
                        alt={organization.name}
                        className=""
                      />
                      <AvatarFallback className="rounded-md uppercase text-xs">
                        <IconUsers className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </CollapsibleTrigger>
              }
              // tooltip={item.title}
            >
              {organization.name}
            </SidebarMenuButton>
          </Link>
          {renderDropdown({
            customTrigger: (
              <SidebarMenuSub className="h-3">
                <SidebarMenuButton
                  icon={
                    <IconDots
                      className={cn(
                        "text-sidebar-foreground/0 aspect-square p-0 h-3 group-hover/coltrig:text-sidebar-foreground data-[state=open]:text-sidebar-foreground transition-all relative bg-transparent hover:bg-border cursor-pointer",
                      )}
                    />
                  }
                ></SidebarMenuButton>
              </SidebarMenuSub>
            ),
          })}
        </SidebarMenuItem>
        <SidebarGroup className={cn("")}>
          <CollapsibleContent className="flex flex-col gap-0.5">
            <SidebarMenuItem
              className="cursor-pointer min-h-auto pl-3"
              isActive={pathname.includes(`/admin/${organization.id}/tasks`)}
            >
              <Link
                to={`/admin/$orgId/tasks`}
                params={{ orgId: organization.id }}
                className="w-full cursor-pointer"
              >
                <SidebarMenuButton
                  size="small"
                  className="cursor-pointer"
                  icon={<IconProgress size={16} />}
                  tooltip={"Tasks"}
                >
                  <span>Tasks</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem
              className="cursor-pointer min-h-auto pl-3"
              isActive={pathname.includes(
                `/admin/settings/org/${organization.id}`,
              )}
            >
              <Link
                to={`/admin/settings/org/$orgId`}
                params={{ orgId: organization.id }}
                className="w-full cursor-pointer"
              >
                <SidebarMenuButton
                  size="small"
                  className="cursor-pointer"
                  icon={<IconSettings size={16} />}
                  tooltip={"Manage"}
                >
                  <span>Manage</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </>
  );

  // Desktop + Sidebar Closed: Dropdown with organization options
  const renderDropdownView = () => (
    <SidebarMenuItem>{renderDropdown({})}</SidebarMenuItem>
  );

  interface DropdownProps {
    customTrigger?: React.ReactNode;
  }

  const renderDropdown = (props: DropdownProps) => (
    <DropdownMenu open={editOpen} onOpenChange={setEditOpen}>
      <DropdownMenuTrigger asChild>
        {props.customTrigger ? (
          props.customTrigger
        ) : (
          <SidebarMenuButton
            tooltip={organization.name}
            icon={
              <Avatar className="h-4 w-4 rounded-md">
                <AvatarImage
                  src={organization.logo || ""}
                  alt={organization.name}
                />
                <AvatarFallback className="rounded-md uppercase text-xs">
                  <IconUsers className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            }
          >
            <span>{organization.name}</span>
          </SidebarMenuButton>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          "w-60 rounded-lg p-0 z-[999]",
          isMobile && "w-(--radix-dropdown-menu-trigger-width) min-w-56",
        )}
        side={isMobile ? "top" : "right"}
        align="start"
      >
        <DropdownMenuLabel className="flex items-start gap-3 p-2">
          <Avatar className="h-9 w-9 rounded-md">
            <AvatarImage
              src={organization.logo || ""}
              alt={organization.name}
            />
            <AvatarFallback className="rounded-md uppercase text-xs">
              <IconUsers className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="text-foreground truncate text-sm font-medium">
              {organization.name}
            </span>
            <span className="text-muted-foreground truncate text-xs font-normal">
              {organization.slug}.{process.env.VITE_ROOT_DOMAIN}
            </span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild>
            <Link
              to={`/admin/$orgId/tasks`}
              params={{ orgId: organization.id }}
              className="flex items-center gap-2"
            >
              <IconProgress className="h-4 w-4" />
              <span>Tasks</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup className="p-1">
          <Collapsible
            open={dropdownSettingsOpen}
            onOpenChange={setDropdownSettingsOpen}
          >
            <div className="flex items-center">
              <DropdownMenuItem asChild className="flex-1">
                <Link
                  to={`/admin/settings/org/$orgId`}
                  params={{ orgId: organization.id }}
                  className="flex items-center gap-2"
                >
                  <IconSettings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 aspect-square p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropdownSettingsOpen((prev) => !prev);
                  }}
                >
                  <IconChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      dropdownSettingsOpen && "rotate-90",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="max-h-56 overflow-auto">
              {orgSubItems.map((item) => {
                const url = `/admin/settings/org/${organization.id}/${item.slug}`;
                const isActive =
                  item.matchType === "includes"
                    ? pathname.includes(url)
                    : pathname === url;
                const Icon = isActive ? item.activeIcon : item.icon;
                return (
                  <DropdownMenuItem key={item.slug} asChild className="ml-3">
                    <Link
                      to={url}
                      className={cn(
                        "flex items-center gap-2",
                        isActive && "text-primary",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Determine which view to render based on state
  const getOrganizationView = () => {
    if (isMobile) {
      return renderCollapsibleView();
    }
    if (isSidebarOpen) {
      return renderCollapsibleView();
    }
    return renderDropdownView();
  };

  return (
    <>
      {getOrganizationView()}

      {/* <UpdateOrgDialog organization={organization} isOpen={isDialogOpen} onOpenChange={setIsOpen} /> */}
    </>
  );
}
