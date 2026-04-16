import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import { IconCalendarEvent, IconX } from "@tabler/icons-react";
import { releaseStatusConfig, RELEASE_STATUS_ORDER } from "./config";

interface ReleaseInfoProps {
  release: schema.ReleaseWithTasks;
  onStatusUpdate: (status: schema.releaseType["status"]) => Promise<void>;
  onTargetDateUpdate: (date: Date | null) => Promise<void>;
  onReleasedAtUpdate: (date: Date | null) => Promise<void>;
}

export function ReleaseInfo({
  release,
  onStatusUpdate,
  onTargetDateUpdate,
  onReleasedAtUpdate,
}: ReleaseInfoProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={"primary"}
              size={"sm"}
              className={cn(
                "border-transparent! rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                releaseStatusConfig[release.status].badgeClassName,
                "",
              )}
            >
              {releaseStatusConfig[release.status].icon("w-3 h-3")}
              {releaseStatusConfig[release.status].label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {RELEASE_STATUS_ORDER.map((status) => {
              const config = releaseStatusConfig[status];
              return (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onStatusUpdate(status)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {config.icon("w-4 h-4")}
                    <span>{config.label}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Target Date */}
      <div className="flex flex-col gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"primary"}
              size={"sm"}
              className={cn(
                "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                release.targetDate
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <IconCalendarEvent className="w-3 h-3" />
              {release.targetDate
                ? formatDate(release.targetDate)
                : "No target date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={
                release.targetDate ? new Date(release.targetDate) : undefined
              }
              onSelect={(date) => onTargetDateUpdate(date || null)}
            />
            {release.targetDate && (
              <div className="p-2 border-t">
                <Button
                  variant={"primary"}
                  size={"sm"}
                  className={cn(
                    "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                  )}
                  onClick={() => onTargetDateUpdate(null)}
                >
                  <IconX className="w-3 h-3 mr-1" />
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Released At */}
      <div className="flex flex-col gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"primary"}
              size={"sm"}
              className={cn(
                "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                release.releasedAt
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <IconCalendarEvent className="w-3 h-3" />
              {release.releasedAt
                ? formatDate(release.releasedAt)
                : "No release date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={
                release.releasedAt ? new Date(release.releasedAt) : undefined
              }
              onSelect={(date) => onReleasedAtUpdate(date || null)}
            />
            {release.releasedAt && (
              <div className="p-2 border-t">
                <Button
                  variant={"primary"}
                  size={"sm"}
                  className={cn(
                    "border-transparent! bg-transparent rounded-lg cursor-pointer gap-1.5 justify-start text-xs h-auto p-1 w-fit",
                  )}
                  onClick={() => onReleasedAtUpdate(null)}
                >
                  <IconX className="w-3 h-3 mr-1" />
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
