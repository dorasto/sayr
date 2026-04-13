import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import {
  Tile,
  TileAction,
  TileHeader,
  TileIcon,
} from "@repo/ui/components/doras-ui/tile";
import { IconLoader2, IconMailCheck } from "@tabler/icons-react";
import { useState } from "react";
import { inviteAction } from "@/lib/fetches/organization";
import type { PendingInviteWithOrg } from "@/routes/(admin)/home/index";

interface PendingInvitesSectionProps {
  invites: PendingInviteWithOrg[];
}

export function PendingInvitesSection({ invites }: PendingInvitesSectionProps) {
  const [items, setItems] = useState<PendingInviteWithOrg[]>(invites);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  const handleAction = async (
    invite: PendingInviteWithOrg,
    type: "accept" | "deny",
  ) => {
    setLoadingId(`${invite.id}-${type}`);
    setError(null);

    try {
      const result = await inviteAction(invite, type);

      if (result.success) {
        if (type === "accept") {
          window.location.href = `/${invite.organizationId}`;
          // Don't remove from list — we're navigating away
          return;
        }
        // Optimistically remove declined invite from list
        setItems((prev) => prev.filter((i) => i.id !== invite.id));
      } else {
        setError(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label variant="heading" className="text-base flex items-center gap-2">
          <IconMailCheck className="size-4" />
          Pending Invites
        </Label>
      </div>
      <div className="flex flex-wrap gap-3 w-full">
        {items.map((invite) => {
          const org = invite.organization;
          const isAccepting = loadingId === `${invite.id}-accept`;
          const isDeclining = loadingId === `${invite.id}-deny`;
          const isBusy = isAccepting || isDeclining;

          return (
            <Tile
              key={invite.id}
              className="flex-[1_1_calc(33.333%-0.5rem)] min-w-full"
            >
              <TileHeader className="w-full">
                <TileIcon className="h-full aspect-square flex items-center justify-center bg-transparent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={org?.logo || ""} alt={org?.name} />
                    <AvatarFallback className="text-xs">
                      {org?.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                </TileIcon>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {org?.name ?? "Unknown organization"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    You've been invited to join this organization
                  </p>
                </div>
              </TileHeader>
              <TileAction>
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  disabled={isBusy}
                  onClick={() => handleAction(invite, "accept")}
                >
                  {isAccepting ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Accept"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  disabled={isBusy}
                  onClick={() => handleAction(invite, "deny")}
                >
                  {isDeclining ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Decline"
                  )}
                </Button>
              </TileAction>
            </Tile>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
