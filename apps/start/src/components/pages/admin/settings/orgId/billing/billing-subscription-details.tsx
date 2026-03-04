import { Badge } from "@repo/ui/components/badge";
import {
  Tile,
  TileDescription,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Label } from "@repo/ui/components/label";
import { Progress } from "@repo/ui/components/progress";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import {
  IconAlertTriangle,
  IconSparkles,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import type { SubscriptionDetails } from "@/lib/fetches/organization";
import { revokeSubscription } from "@/lib/fetches/organization";
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
  subscription: SubscriptionDetails | null;
  onSubscriptionRevoked?: () => void;
}

export function BillingSubscriptionDetails({
  subscription,
  onSubscriptionRevoked,
}: BillingSubscriptionDetailsProps) {
  const { organization } = useLayoutOrganizationSettings();
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  const members = organization.members ?? [];
  const assignedCount = members.filter((m) => m.seatAssigned).length;

  const handleRevokeNow = async () => {
    setRevokeLoading(true);
    try {
      const result = await revokeSubscription(organization.id);
      if (result.success) {
        setRevokeDialogOpen(false);
        onSubscriptionRevoked?.();
      }
    } finally {
      setRevokeLoading(false);
    }
  };

  // Free plan — don't show subscription details
  if (organization.plan === "free" || !organization.polarSubscriptionId) {
    return null;
  }

  if (!subscription) {
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

  const isCanceled = subscription.status === "canceled";
  const isCanceling = subscription.cancelAtPeriodEnd && !isCanceled;
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
            <div className="flex items-center gap-2">
              {isCanceling ? (
                <Badge variant="outline" className="text-xs text-yellow-500">
                  To be canceled
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={cn("text-xs", getStatusColor(subscription.status))}
                >
                  {getStatusLabel(subscription.status)}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-foreground">
              {formatCurrency(subscription.amount, subscription.currency)}
            </span>
            <span className="text-sm text-muted-foreground">
              /{getIntervalLabel(subscription.recurringInterval)}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-semibold text-foreground">
              {subscription.seats} seats
            </span>
            <span className="text-sm text-muted-foreground">
              at {formatCurrency(pricePerSeat, subscription.currency)}/seat/
              {getIntervalLabel(subscription.recurringInterval)}
            </span>
          </div>

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
          {isCanceling && (
            <div className="flex items-center gap-1.5">
              <IconAlertTriangle className="size-3.5 text-yellow-500" />
              <span className="text-xs text-yellow-500">
                Cancels {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          )}
          {isCanceled && (
            <div className="flex items-center gap-1.5">
              <IconAlertTriangle className="size-3.5 text-yellow-500" />
              <span className="text-xs text-yellow-500">
                Subscription canceled
              </span>
            </div>
          )}
          {/* Cancel Now — testing only, remove before production */}
          {!isCanceled && (
            <AlertDialog
              open={revokeDialogOpen}
              onOpenChange={setRevokeDialogOpen}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-fit ml-auto"
                >
                  Cancel subscription immediately
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle asChild>
                    <Label variant="heading">
                      Cancel subscription immediately?
                    </Label>
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <Label variant="description">
                      This will immediately revoke your Pro subscription. Your
                      organization will be downgraded to the free plan and
                      excess members may lose access. This cannot be undone.
                    </Label>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={revokeLoading}>
                    Keep subscription
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={revokeLoading}
                    onClick={handleRevokeNow}
                  >
                    {revokeLoading ? "Canceling..." : "Cancel now"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </Tile>

        {/* Seats */}
        <Tile className="md:w-full flex-col gap-2 items-stretch p-3 py-2">
          <div className="flex items-center justify-between">
            <TileTitle className="text-sm">Seats</TileTitle>
            <TileDescription
              className={cn(
                "text-sm",
                assignedCount >= (subscription.seats ?? 0)
                  ? "text-destructive"
                  : "text-foreground",
              )}
            >
              {assignedCount}/{subscription.seats ?? 0}
            </TileDescription>
          </div>
          <Progress
            value={
              (subscription.seats ?? 0) > 0
                ? Math.round((assignedCount / (subscription.seats ?? 1)) * 100)
                : 0
            }
            className={cn(
              "h-4",
              assignedCount >= (subscription.seats ?? 0) &&
                "[&>div]:bg-destructive",
            )}
          />
          <Alert
            className={cn(
              "border mt-1",
              assignedCount >= (subscription.seats ?? 0)
                ? "bg-destructive/15 text-destructive-foreground border-destructive/40"
                : "bg-primary/15 text-primary-foreground border-primary/40",
            )}
          >
            <IconInfoCircle />
            <AlertTitle>
              {(subscription.seats ?? 0) - assignedCount > 0
                ? `${(subscription.seats ?? 0) - assignedCount} unused seat${(subscription.seats ?? 0) - assignedCount !== 1 ? "s" : ""} available`
                : "All seats in use"}
            </AlertTitle>
            <AlertDescription>
              {(subscription.seats ?? 0) - assignedCount > 0
                ? `You can assign ${(subscription.seats ?? 0) - assignedCount === 1 ? "this seat" : "these seats"} to users without seats, or remove unused seats from "Add or remove seats" in the Seat Assignments section.`
                : 'To invite new users, you\'ll need to add seats from "Add or remove seats" in the Seat Assignments section.'}
            </AlertDescription>
          </Alert>
        </Tile>
      </div>
    </div>
  );
}
