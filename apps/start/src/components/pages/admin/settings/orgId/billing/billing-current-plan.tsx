import { Badge } from "@repo/ui/components/badge";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { IconSparkles } from "@tabler/icons-react";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";

interface BillingCurrentPlanProps {
  memberCount: number;
}

export function BillingCurrentPlan({ memberCount }: BillingCurrentPlanProps) {
  const { organization } = useLayoutOrganizationSettings();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Current plan
        </span>
        <a
          href="https://sayr.io/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all plans &rarr;
        </a>
      </div>
      <Tile className="md:w-full">
        <TileHeader>
          <TileIcon className="bg-transparent ">
            <IconSparkles className="size-6!" />
          </TileIcon>
          <TileTitle className="flex items-center gap-2">
            {organization.plan === "free" ? "Free" : organization.plan === "pro" ? "Pro" : "Enterprise"}
            <Badge variant="outline" className="text-xs">
              Current
            </Badge>
          </TileTitle>
          <TileDescription>
            {organization.plan === "free"
              ? "Free for all users"
              : `$3/seat/mo`}
          </TileDescription>
        </TileHeader>
        <TileAction>
          <div className="flex flex-col text-right">
            <span className="text-xs text-muted-foreground">Members</span>
            <span className="text-lg font-semibold text-foreground">
              {memberCount}
            </span>
          </div>
        </TileAction>
      </Tile>
    </div>
  );
}
