import { authClient } from "@repo/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, getInitials } from "@repo/util";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { UserSettingsDialog } from "@/components/settings/user-settings-dialog";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getOrgSlugFromPath, getPortalSection } from "@/lib/portal/nav";
import LoginDialog from "../auth/login";
import { PortalSearch } from "./portal/search/PortalSearch";

/** 64px public top bar: org mark + name, Feedback / Roadmap / Changelog (+ Activity when logged in), search palette trigger, Log in or user avatar. */
export default function PublicNavigation() {
  const { data: session } = authClient.useSession();
  const { organization } = usePublicOrganizationLayout();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  const orgSlug = getOrgSlugFromPath(rawPathname);
  const section = getPortalSection(rawPathname, orgSlug);

  const feedbackPath: string = `/orgs/${orgSlug}`;
  const navLinks: { to: string; label: string; active: boolean }[] = [
    { to: feedbackPath, label: "Feedback", active: section === "feedback" },
    {
      to: `/orgs/${orgSlug}/roadmap`,
      label: "Roadmap",
      active: section === "roadmap",
    },
    {
      to: `/orgs/${orgSlug}/releases`,
      label: "Changelog",
      active: section === "changelog",
    },
    ...(session
      ? [
          {
            to: `/orgs/${orgSlug}/activity`,
            label: "Activity",
            active: section === "activity",
          },
        ]
      : []),
  ];

  return (
    <>
      <header className="z-50 h-14 w-full md:h-16 shrink-0 border-b bg-background">
        <div className="flex h-full items-center gap-1 px-3 md:gap-2">
          {/* Org identity */}
          <Link
            to={feedbackPath}
            className="mr-2 flex min-w-0 items-center gap-2.5 rounded-md outline-none max-md:min-h-11 max-md:flex-1 md:mr-5 md:max-w-[220px] md:shrink-0"
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
              <Link
                key={link.label}
                to={link.to}
                aria-current={link.active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-3 font-medium text-muted-foreground text-sm outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground",
                  link.active && "bg-muted text-foreground",
                )}
              >
                {link.label}
              </Link>
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
            {session ? (
              <button
                type="button"
                aria-label="Account settings"
                onClick={() => setSettingsOpen(true)}
                className="flex cursor-pointer items-center justify-center rounded-full outline-none max-md:size-11"
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
              </button>
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
          isOpen={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={session.user}
        />
      )}
    </>
  );
}
