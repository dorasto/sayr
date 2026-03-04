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
import type { SubscriptionDetails } from "@/lib/fetches/organization";
import { cn } from "@/lib/utils";
import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";

function formatPricePerSeat(subscription: SubscriptionDetails | null): string {
  if (!subscription || !subscription.seats || subscription.seats === 0) {
    return "Free for all users";
  }
  const perSeat = subscription.amount / subscription.seats;
  const currency = subscription.currency ?? "usd";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(perSeat / 100);
  const interval = subscription.recurringInterval === "year" ? "yr" : "mo";
  return `${formatted}/seat/${interval}`;
}

interface BillingCurrentPlanProps {
  totalMembers: number;
  subscription: SubscriptionDetails | null;
}

export function BillingCurrentPlan({
  totalMembers,
  subscription,
}: BillingCurrentPlanProps) {
  const { organization } = useLayoutOrganizationSettings();
  const API_URL =
    import.meta.env.VITE_APP_ENV === "development"
      ? "/backend-api/internal"
      : "/api/internal";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          Current plan
        </span>
        <div className="flex items-center gap-2">
          {organization.plan === "free" ? (
            <a
              href="https://sayr.io/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all plans &rarr;
            </a>
          ) : (
            <a
              href={`${API_URL}/v1/polar/customer-portal?orgId=${organization.id}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Manage billing &rarr;
            </a>
          )}
        </div>
      </div>
      <Tile className="md:w-full">
        <TileHeader>
          <TileIcon className="bg-transparent">
            <IconSparkles
              className={cn(
                "size-6!",
                organization.plan !== "free" && "text-primary",
              )}
            />
          </TileIcon>
          <TileTitle className="flex items-center gap-2">
            {organization.plan === "free"
              ? "Free"
              : organization.plan === "pro"
                ? "Pro"
                : "Enterprise"}
            <Badge variant="outline" className="text-xs">
              Current
            </Badge>
          </TileTitle>
          <TileDescription>
            {organization.plan === "free"
              ? "Free for all users"
              : formatPricePerSeat(subscription)}
          </TileDescription>
        </TileHeader>
        <TileAction>
          <div className="flex flex-col text-right">
            <span className="text-xs text-muted-foreground">Members</span>
            <span className="text-lg font-semibold text-foreground">
              {totalMembers}
            </span>
          </div>
        </TileAction>
      </Tile>
    </div>
  );
}
