import { authClient } from "@repo/auth/client";
import {
  TabbedDialog,
  TabPanel,
} from "@repo/ui/components/tomui/tabbed-dialog";
import {
  IconHome,
  IconLogout,
  IconPalette,
  IconUser,
} from "@tabler/icons-react";
import { useCallback } from "react";
import {
  UserSettingsContent,
  UserPreferences,
} from "@/components/pages/admin/settings/user-settings-content";

interface UserSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name: string;
    displayName?: string | null;
    email: string;
    image?: string | null;
  };
}

export function UserSettingsDialog({
  isOpen,
  onOpenChange,
  user,
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
      defaultTab="general"
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
              id: "preferences",
              label: "Preferences",
              icon: <IconPalette className="size-4" />,
              title: "Preferences",
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
      <TabPanel tabId="general">
        <UserSettingsContent
          account={{
            name: user.name,
            displayName: user.displayName ?? null,
            email: user.email,
            image: user.image ?? null,
          }}
          onAccountUpdated={handleAccountUpdated}
        />
      </TabPanel>
      <TabPanel tabId="preferences">
        <UserPreferences />
      </TabPanel>
    </TabbedDialog>
  );
}
