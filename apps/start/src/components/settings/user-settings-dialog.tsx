import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/components/button";
import {
  TabbedDialog,
  TabPanel,
} from "@repo/ui/components/tomui/tabbed-dialog";
import { IconLogout, IconPalette, IconUser } from "@tabler/icons-react";
import { useCallback } from "react";
import {
  UserSettingsContent,
  UserPreferences,
} from "@/components/pages/admin/settings/user-settings-content";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Separator } from "@repo/ui/components/separator";

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
          ],
        },
      ]}
      // footer={
      // 	<Button
      // 		variant="ghost"
      // 		className="text-destructive hover:text-destructive hover:bg-destructive/10"
      // 		onClick={handleSignOut}
      // 	>
      // 		<IconLogout className="size-4" />
      // 		Sign out
      // 	</Button>
      // }
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
        <Separator className="mb-3" />
        <Button variant={"primary"} onClick={handleSignOut}>
          <IconLogout className="" /> Log out
        </Button>
      </TabPanel>
      <TabPanel tabId="preferences">
        <UserPreferences />
      </TabPanel>
    </TabbedDialog>
  );
}
