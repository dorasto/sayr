import { useLayoutData } from "@/components/generic/Context";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { Button } from "@repo/ui/components/button";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { IconRocket } from "@tabler/icons-react";
const API_URL = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal"

export function BillingUpgradePrompt() {
  const { account } = useLayoutData();
  const { organization } = useLayoutOrganizationSettings();
  return (
    <Tile
      variant="outline"
      className="md:w-full border-primary/30 bg-primary/5"
    >
      <TileHeader>
        <TileIcon className="bg-primary/15 border-none">
          <IconRocket className="size-6! text-primary" />
        </TileIcon>
        <TileTitle>Upgrade to Pro</TileTitle>
        <TileDescription>
          $3/seat/mo &mdash; Unlimited members, releases, views, and more.
        </TileDescription>
      </TileHeader>
      <TileAction>
        <a href={`${API_URL}/v1/polar/checkout?orgId=${organization.id}&email=${encodeURIComponent(account.email ?? "")}&name=${encodeURIComponent(account.name ?? "")}&userId=${account.id}`} rel="noopener noreferrer">
          <Button size="sm" className="shrink-0">
            Upgrade
          </Button>
        </a>
      </TileAction>
    </Tile>
  );
}
