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

export function BillingUpgradePrompt() {
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
        <Button size="sm" className="shrink-0">
          Upgrade
        </Button>
      </TileAction>
    </Tile>
  );
}
