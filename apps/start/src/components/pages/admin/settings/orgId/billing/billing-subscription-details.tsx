import { useEffect, useState } from "react";
import { Badge } from "@repo/ui/components/badge";
import {
  Tile,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Label } from "@repo/ui/components/label";
import {
  IconCreditCard,
  IconCalendar,
  IconUsers,
  IconAlertTriangle,
  IconSparkles,
} from "@tabler/icons-react";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import {
  getSubscriptionDetails,
  type SubscriptionDetails,
} from "@/lib/fetches/organization";
import { cn } from "@/lib/utils";
import { Separator } from "@repo/ui/components/separator";

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "text-success";
    case "trialing":
      return "text-muted-foreground";
    case "past_due":
      return "text-destructive";
    case "canceled":
    case "unpaid":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Past Due";
    case "canceled":
      return "Canceled";
    case "unpaid":
      return "Unpaid";
    case "incomplete":
      return "Incomplete";
    case "incomplete_expired":
      return "Expired";
    default:
      return status;
  }
}

function getIntervalLabel(interval: string): string {
  switch (interval) {
    case "month":
      return "mo";
    case "year":
      return "yr";
    case "week":
      return "wk";
    case "day":
      return "day";
    default:
      return interval;
  }
}

interface BillingSubscriptionDetailsProps {
  memberCount: number;
}

export function BillingSubscriptionDetails({
  memberCount,
}: BillingSubscriptionDetailsProps) {
  const { organization } = useLayoutOrganizationSettings();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization.plan === "free" || !organization.polarSubscriptionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getSubscriptionDetails(organization.id).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setSubscription(res.data);
      } else {
        setError(res.error ?? "Failed to load subscription");
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [organization.id, organization.plan, organization.polarSubscriptionId]);

  // Free plan — don't show subscription details
  if (organization.plan === "free" || !organization.polarSubscriptionId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Label variant="subheading">Subscription</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="flex flex-col gap-3">
        <Label variant="subheading">Subscription</Label>
        <Tile variant="outline" className="md:w-full">
          <TileHeader>
            <TileIcon className="bg-destructive/10 border-none">
              <IconAlertTriangle className="size-4! text-destructive" />
            </TileIcon>
            <TileTitle className="text-sm">
              Unable to load subscription details
            </TileTitle>
            <TileDescription>
              {error ?? "No subscription data available"}
            </TileDescription>
          </TileHeader>
        </Tile>
      </div>
    );
  }

  const isCanceling =
    subscription.cancelAtPeriodEnd && !subscription.canceledAt;
  const isCanceled = subscription.status === "canceled";
  const pricePerSeat = subscription.seats
    ? subscription.amount / subscription.seats
    : subscription.amount;

  return (
    <div className="flex flex-col gap-3">
      <Label variant="subheading">Subscription</Label>

      <div className="flex flex-col gap-3">
        {/* Plan & Status */}
        <Tile className="md:w-full flex-col items-start gap-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <IconSparkles className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {subscription.product.name}
              </span>
            </div>
            <Badge
              variant="outline"
              className={cn("text-xs", getStatusColor(subscription.status))}
            >
              {getStatusLabel(subscription.status)}
            </Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-foreground">
              {formatCurrency(subscription.amount, subscription.currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              /{getIntervalLabel(subscription.recurringInterval)}
            </span>
          </div>
          {subscription.seats != null && (
            <span className="text-xs text-muted-foreground">
              {formatCurrency(pricePerSeat, subscription.currency)}/seat/
              {getIntervalLabel(subscription.recurringInterval)}
            </span>
          )}
          <Separator />
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Current period
              </span>
              <span className="text-xs text-foreground">
                {formatDate(subscription.currentPeriodStart)} &ndash;{" "}
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
            {!isCanceling && !isCanceled && subscription.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Next due date
                </span>
                <span className="text-xs text-foreground">
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            )}
          </div>
          {(isCanceling || isCanceled) && (
            <div className="flex items-center gap-1.5 mt-1">
              <IconAlertTriangle className="size-3.5 text-yellow-500" />
              <span className="text-xs text-yellow-500">
                {isCanceled
                  ? "Subscription canceled"
                  : `Cancels ${formatDate(subscription.currentPeriodEnd)}`}
              </span>
            </div>
          )}
        </Tile>

        {/* Seats */}
        <Tile className="md:w-full flex-col items-start gap-2 p-3">
          <div className="flex items-center gap-2">
            <IconUsers className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Seats</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-foreground">
              {memberCount}
            </span>
            {subscription.seats != null && (
              <span className="text-sm text-muted-foreground">
                / {subscription.seats} seats
              </span>
            )}
          </div>
          {subscription.seats != null && (
            <span className="text-xs text-muted-foreground">
              {subscription.seats - memberCount > 0
                ? `${subscription.seats - memberCount} seat${subscription.seats - memberCount !== 1 ? "s" : ""} available`
                : "All seats in use"}
            </span>
          )}
        </Tile>
      </div>
    </div>
  );
}
