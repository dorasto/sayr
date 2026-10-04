import { authClient } from "@repo/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, getInitials } from "@repo/util";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  isUserSettingsTab,
  UserSettingsDialog,
  type UserSettingsTab,
} from "@/components/settings/user-settings-dialog";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getOrgSlugFromPath, getPortalSection } from "@/lib/portal/nav";
import LoginDialog from "../auth/login";
import { ActivityBody } from "./portal/activity/ActivityBody";
import { PortalSearch } from "./portal/search/PortalSearch";

/**
 * 64px public top bar: org mark + name, Feedback / Changelog, search palette trigger, Log in or user avatar. The avatar
 * opens the account settings dialog (with the viewer's activity on this org); `?settings=<tab>` on any portal page
 * opens it on that tab, which is how links and the Connections OAuth return land back in it.
 */
export default function PublicNavigation() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { organization } = usePublicOrganizationLayout();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<UserSettingsTab>("general");
  const settingsParam = useRouterState({
    select: (s) => (s.location.search as Record<string, unknown>).settings,
  });

  useEffect(() => {
    if (!isUserSettingsTab(settingsParam)) return;
    setSettingsTab(settingsParam);
    setSettingsOpen(true);
  }, [settingsParam]);

  const openSettings = () => {
    setSettingsTab("general");
    setSettingsOpen(true);
  };

  const handleSettingsOpenChange = (open: boolean) => {
    setSettingsOpen(open);
    if (!open && settingsParam !== undefined) {
      const url = new URL(window.location.href);
      url.searchParams.delete("settings");
      router.history.replace(`${url.pathname}${url.search}${url.hash}`);
    }
  };

  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const orgSlug = getOrgSlugFromPath(rawPathname);
  const section = getPortalSection(rawPathname, orgSlug);

  const feedbackPath: string = `/orgs/${orgSlug}`;
  const navLinks: { to: string; label: string; active: boolean }[] = [
    { to: feedbackPath, label: "Feedback", active: section === "feedback" },
    {
      to: `/orgs/${orgSlug}/releases`,
      label: "Changelog",
      active: section === "changelog",
    },
  ];

  return (
    <>
      <header className="z-50 h-14 w-full md:h-16 shrink-0 border-b bg-background">
        <div className="flex h-full items-center gap-1 px-3 md:gap-2">
          {/* Org identity */}
          <Link
            to={feedbackPath}
            className="mr-2 flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-11 max-md:flex-1 md:mr-5 md:max-w-[220px] md:shrink-0"
          >
            <Avatar className="size-[30px] shrink-0 rounded-lg">
              {organization.logo ? (
                <AvatarImage
                  src={ensureCdnUrl(organization.logo)}
                  alt={organization.name}
                />
              ) : null}
              <AvatarFallback className="rounded-lg bg-primary font-semibold text-primary-foreground text-xs">
                {getInitials(organization.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate font-semibold text-[15px] text-foreground tracking-[-0.01em]">
              {organization.name}
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden gap-0.5 md:flex">
            {navLinks.map((link) => (
              <Button
                key={link.label}
                render={
                  <Link
                    to={link.to}
                    aria-current={link.active ? "page" : undefined}
                  />
                }
                nativeButton={false}
                variant="ghost"
                size="sm"
                className={cn(
                  "hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground",
                  link.active && "bg-muted text-foreground",
                )}
              >
                {link.label}
              </Button>
            ))}
          </nav>

          <span className="hidden grow md:block" />

          <PortalSearch
            orgSlug={organization.slug}
            orgId={organization.id}
            orgShortId={organization.shortId}
          />

          {/* Auth */}
          <div className="shrink-0">
            {/* Same box as the avatar button, so nothing shifts once the session loads. */}
            {sessionPending && !session ? (
              <div className="flex items-center justify-center max-md:size-11">
                <Skeleton className="size-8 rounded-full" />
              </div>
            ) : session ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Account settings"
                onClick={openSettings}
                className="size-8 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-ring max-md:size-11"
              >
                <Avatar className="size-8">
                  {session.user.image ? (
                    <AvatarImage
                      src={ensureCdnUrl(session.user.image)}
                      alt={session.user.name ?? ""}
                    />
                  ) : null}
                  <AvatarFallback className="font-semibold text-xs">
                    {getInitials(session.user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            ) : (
              <LoginDialog
                trigger={
                  <Button variant="outline" size="sm">
                    Log in
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </header>

      {session && (
        <UserSettingsDialog
          key={settingsTab}
          isOpen={settingsOpen}
          onOpenChange={handleSettingsOpenChange}
          user={session.user}
          defaultTab={settingsTab}
          activity={<ActivityBody userId={session.user.id} stacked />}
          connectionsCallbackURL={
            typeof window === "undefined"
              ? undefined
              : `${window.location.origin}${window.location.pathname}?settings=connections`
          }
        />
      )}
    </>
  );
}
