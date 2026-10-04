import { authClient } from "@repo/auth/client";
import { Label } from "@repo/ui/components/label";
import {
  TabbedDialog,
  TabPanel,
} from "@repo/ui/components/tomui/tabbed-dialog";
import {
  IconActivity,
  IconHome,
  IconKey,
  IconLock,
  IconLogout,
  IconPlug,
  IconShield,
  IconUser,
} from "@tabler/icons-react";
import { type ReactNode, useCallback } from "react";
import {
  UserSettingsContent,
  UserPreferences,
} from "@/components/pages/admin/settings/user-settings-content";
import { ConnectionsSettings } from "./sections/connections-settings";
import { DataExport } from "./sections/data-export";
import { SecuritySettings } from "./sections/security-settings";

/** The dialog's tabs; also the values of the portal's `?settings=` param. */
export const USER_SETTINGS_TABS = [
  "general",
  "security",
  "connections",
  "privacy",
  "activity",
] as const;

export type UserSettingsTab = (typeof USER_SETTINGS_TABS)[number];

export function isUserSettingsTab(value: unknown): value is UserSettingsTab {
  return USER_SETTINGS_TABS.some((tab) => tab === value);
}

interface UserSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name: string;
    displayName?: string | null;
    email: string;
    image?: string | null;
    id: string;
  };
  /** The tab shown on open. @default "general" */
  defaultTab?: UserSettingsTab;
  /** The Activity tab's content (the portal's per-org activity); the tab is left out without it. */
  activity?: ReactNode;
  /** Where a Connections OAuth flow returns, so it lands back in this dialog. */
  connectionsCallbackURL?: string;
}

/**
 * Personal settings in a dialog, for the org portals (most people never visit admin). The sections are the same
 * self-contained components the admin `/settings` pages render (`./sections`), so the two stay in step: add a section
 * there and give it a tab here. General holds the profile and the preferences together, as on admin `/settings`. Only
 * API keys (a developer tool with its own side panel) and the dashboard link out; link items carry an external-link
 * icon (`TabbedDialog`).
 */
export function UserSettingsDialog({
  isOpen,
  onOpenChange,
  user,
  defaultTab = "general",
  activity,
  connectionsCallbackURL,
}: UserSettingsDialogProps) {
  const handleAccountUpdated = useCallback(() => {
    // Re-fetch the session so authClient.useSession() picks up the changes
    // across the public pages (side.tsx, comments, etc.)
    authClient.getSession();
  }, []);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    window.location.reload();
  }, []);

  return (
    <TabbedDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Settings"
      defaultTab={activity || defaultTab !== "activity" ? defaultTab : "general"}
      layout="side"
      size="lg"
      stickyHeader
      groupedTabs={[
        {
          name: "Account",
          items: [
            {
              id: "general",
              label: "General",
              icon: <IconUser className="size-4" />,
              title: "General",
            },
            {
              id: "security",
              label: "Security",
              icon: <IconShield className="size-4" />,
              title: "Security",
            },
            {
              id: "connections",
              label: "Connections",
              icon: <IconPlug className="size-4" />,
              title: "Connections",
              description: "Connect accounts to sign in with and power integrations",
            },
            {
              id: "privacy",
              label: "Privacy",
              icon: <IconLock className="size-4" />,
              title: "Privacy",
            },
            ...(activity
              ? [
                  {
                    id: "activity",
                    label: "Activity",
                    icon: <IconActivity className="size-4" />,
                    title: "Your activity",
                    description: "The posts you have voted on and posted here.",
                  },
                ]
              : []),
          ],
        },
        {
          name: "More",
          items: [
            {
              id: "api-keys",
              label: "API keys",
              icon: <IconKey className="size-4" />,
              href: `${import.meta.env.VITE_URL_ROOT}/settings/api-keys`,
            },
            {
              id: "dashboard",
              label: "Dashboard",
              icon: <IconHome className="size-4" />,
              href: `${import.meta.env.VITE_URL_ROOT}`,
            },
            {
              id: "sign-out",
              label: "Log out",
              icon: <IconLogout className="size-4" />,
              onClick: handleSignOut,
            },
          ],
        },
      ]}
    >
      <TabPanel tabId="general" className="flex flex-col gap-6">
        <UserSettingsContent
          account={{
            name: user.name,
            displayName: user.displayName ?? null,
            email: user.email,
            image: user.image ?? null,
            id: user.id,
          }}
          onAccountUpdated={handleAccountUpdated}
        />
        <div className="flex flex-col gap-3">
          <Label variant="heading">Preferences</Label>
          <UserPreferences isDialog={true} />
        </div>
      </TabPanel>
      <TabPanel tabId="security">
        <SecuritySettings />
      </TabPanel>
      <TabPanel tabId="connections">
        <ConnectionsSettings callbackURL={connectionsCallbackURL} />
      </TabPanel>
      <TabPanel tabId="privacy">
        <DataExport />
      </TabPanel>
      {activity && <TabPanel tabId="activity">{activity}</TabPanel>}
    </TabbedDialog>
  );
}
