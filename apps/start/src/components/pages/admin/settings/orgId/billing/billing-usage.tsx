import {
  Tile,
  TileDescription,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Progress } from "@repo/ui/components/progress";
import { cn } from "@repo/ui/lib/utils";

interface UsageEntry {
  current: number;
  limit: number;
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
          const pct = Math.round((current / limit) * 100);
          const isAtLimit = current >= limit;

          return (
            <Tile
              key={key}
              variant="outline"
              className="md:w-full flex-col gap-2 items-stretch"
            >
              <div className="flex items-center justify-between">
                <TileTitle className="text-xs">{label}</TileTitle>
                <TileDescription
                  className={cn(
                    "text-xs",
                    isAtLimit ? "text-destructive" : "text-foreground",
                  )}
                >
                  {current}/{limit}
                </TileDescription>
              </div>
              <Progress
                value={pct}
                className={cn("h-1.5", isAtLimit && "[&>div]:bg-destructive")}
              />
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
