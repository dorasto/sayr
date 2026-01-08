import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl } from "@repo/util";
import {
  IconChevronDown,
  IconSettings,
  IconSlash,
  IconUsers,
} from "@tabler/icons-react";
import { Link, useLocation, useMatch } from "@tanstack/react-router";
import { useLayoutData } from "@/components/generic/Context";
import { orgSettingsNavigation, settingsNavigation } from "@/lib/routemap";

export default function SettingsNavigationInfo() {
  const location = useLocation();
  const pathname = location.pathname;
  const { organizations } = useLayoutData();

  // Check if we're on an org settings page
  const orgSettingsMatch = useMatch({
    from: "/(admin)/settings/org/$orgId",
    shouldThrow: false,
  });

  const organization = orgSettingsMatch?.loaderData?.organization;
  const orgId = orgSettingsMatch?.params?.orgId;

  // Determine current page for account-level settings
  const isAccountSettings = pathname === "/settings";
  const isConnectionsSettings = pathname === "/settings/connections";

  // For org settings, determine the current sub-page
  const getCurrentOrgSubPage = () => {
    if (!orgId) return null;

    const baseUrl = `/settings/org/${orgId}`;

    for (const item of orgSettingsNavigation) {
      const url = item.slug ? `${baseUrl}/${item.slug}` : baseUrl;
      const isActive =
        item.matchType === "includes"
          ? pathname.includes(url) && pathname !== baseUrl
          : pathname === url;
      if (isActive) {
        return item;
      }
    }

    // Default to General if on base org settings page
    if (pathname === baseUrl) {
      return orgSettingsNavigation[0];
    }

    return null;
  };

  const currentOrgSubPage = getCurrentOrgSubPage();

  // If we're on org settings
  if (organization && orgId) {
    const baseUrl = `/settings/org/${orgId}`;

    return (
      <div className="flex items-center gap-2 text-sm">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/settings" className="">
                  <Button
                    variant={"primary"}
                    className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
                    size={"sm"}
                  >
                    <IconSettings className="h-4 w-4" />
                    <span>Settings</span>
                  </Button>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <IconSlash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={"primary"}
                    className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1"
                    size={"sm"}
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage
                        src={
                          organization.logo
                            ? ensureCdnUrl(organization.logo)
                            : ""
                        }
                        alt={organization.name}
                        className=""
                      />
                      <AvatarFallback className="rounded-md uppercase text-xs">
                        <IconUsers className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span>{organization.name}</span>
                    <IconChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {organizations.map((org) => {
                    const isCurrentOrg = org.id === orgId;
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        asChild
                        className={cn(
                          isCurrentOrg ? "font-bold" : "text-muted-foreground",
                        )}
                      >
                        <Link
                          to="/settings/org/$orgId"
                          params={{ orgId: org.id }}
                          className="flex items-center gap-2"
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage
                              src={org.logo ? ensureCdnUrl(org.logo) : ""}
                              alt={org.name}
                            />
                            <AvatarFallback className="rounded-md uppercase text-xs">
                              <IconUsers className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span>{org.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <IconSlash />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={"primary"}
                    className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1"
                    size={"sm"}
                  >
                    {/*{currentOrgSubPage && (
                      <currentOrgSubPage.activeIcon className="h-4 w-4" />
                    )}*/}
                    <span>{currentOrgSubPage?.title || "General"}</span>
                    <IconChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="">
                  {orgSettingsNavigation.map((item) => {
                    const url = item.slug ? `${baseUrl}/${item.slug}` : baseUrl;
                    const isActive =
                      item.matchType === "includes"
                        ? pathname.includes(url) && pathname !== baseUrl
                        : pathname === url;
                    const Icon = isActive ? item.activeIcon : item.icon;

                    return (
                      <DropdownMenuItem
                        key={item.slug}
                        asChild
                        className={cn(
                          isActive ? "font-bold" : "text-muted-foreground",
                        )}
                      >
                        <Link to={url} className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4")} />
                          <span>{item.title}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }

  // Account-level settings breadcrumb
  const currentAccountPage = isAccountSettings
    ? settingsNavigation[0]
    : isConnectionsSettings
      ? settingsNavigation[1]
      : null;

  if (!currentAccountPage) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/settings" className="">
                <Button
                  variant={"primary"}
                  className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent"
                  size={"sm"}
                >
                  <IconSettings className="h-4 w-4" />
                  <span>Settings</span>
                </Button>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <IconSlash />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={"primary"}
                  className="w-fit text-xs p-1 h-auto rounded-lg bg-transparent gap-1"
                  size={"sm"}
                >
                  {/*<currentAccountPage.activeIcon className="h-4 w-4" />*/}
                  <span>{currentAccountPage.title}</span>
                  <IconChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {settingsNavigation.map((item) => {
                  const isActive = pathname === item.url;
                  const Icon = isActive ? item.activeIcon : item.icon;

                  return (
                    <DropdownMenuItem
                      key={item.slug}
                      asChild
                      className={cn(
                        isActive ? "font-bold" : "text-muted-foreground",
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4")} />
                        <span>{item.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
