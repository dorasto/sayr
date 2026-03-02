import {
  Tile,
  TileDescription,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Progress } from "@repo/ui/components/progress";
import { cn } from "@repo/ui/lib/utils";
import { IconInfinity } from "@tabler/icons-react";

export interface UsageEntry {
  current: number;
  /** `null` means unlimited */
  limit: number | null;
}

interface BillingUsageProps {
  usage: Record<string, UsageEntry>;
}

export function BillingUsage({ usage }: BillingUsageProps) {
  return (
    <div className="flex flex-col gap-3">
      <Label variant={"subheading"}>Usage</Label>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(usage).map(([key, { current, limit }]) => {
          const label = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase());
          const isUnlimited = limit === null;
          const pct = isUnlimited ? 0 : Math.round((current / limit) * 100);
          const isAtLimit = !isUnlimited && current >= limit;

          return (
            <Tile
              key={key}
              variant="outline"
              className="md:w-full flex-col gap-2 items-stretch p-3 py-2"
            >
              <div className="flex items-center justify-between">
                <TileTitle className="text-sm">{label}</TileTitle>
                <TileDescription
                  className={cn(
                    "text-sm",
                    isAtLimit ? "text-destructive" : "text-foreground",
                  )}
                >
                  {isUnlimited ? (
                    <span className="flex items-center">
                      {current}/<IconInfinity className="size-4" />
                    </span>
                  ) : (
                    `${current}/${limit}`
                  )}
                </TileDescription>
              </div>
              {isUnlimited ? (
                <Progress value={100} className="h-1.5" />
              ) : (
                <Progress
                  value={pct}
                  className={cn("h-1.5", isAtLimit && "[&>div]:bg-destructive")}
                />
              )}
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
