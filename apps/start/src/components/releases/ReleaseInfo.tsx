"use client";

import type { schema } from "@repo/database";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { IconCalendarEvent, IconCheck, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import IconPicker from "@/components/generic/icon-picker";
import RenderIcon from "@/components/generic/RenderIcon";
import { releaseStatusConfig, RELEASE_STATUS_ORDER } from "./config";

interface ReleaseInfoProps {
  release: schema.ReleaseWithTasks;
  onUpdate: (data: {
    name: string;
    slug: string;
    icon: string;
    color: string;
  }) => Promise<void>;
  onStatusUpdate: (status: schema.releaseType["status"]) => Promise<void>;
  onTargetDateUpdate: (date: Date | null) => Promise<void>;
}

export function ReleaseInfo({
  release,
  onUpdate,
  onStatusUpdate,
  onTargetDateUpdate,
}: ReleaseInfoProps) {
  const [editName, setEditName] = useState(release.name);
  const [editSlug, setEditSlug] = useState(release.slug);
  const [editIcon, setEditIcon] = useState(release.icon || "IconRocket");
  const [editColor, setEditColor] = useState({
    hsla: release.color || "#3B82F6",
    hex: release.color || "#3B82F6",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when release changes
  useEffect(() => {
    setEditName(release.name);
    setEditSlug(release.slug);
    setEditIcon(release.icon || "IconRocket");
    setEditColor({
      hsla: release.color || "#3B82F6",
      hex: release.color || "#3B82F6",
    });
  }, [release.name, release.slug, release.icon, release.color]);

  const hasChanges =
    editName !== release.name ||
    editSlug !== release.slug ||
    editIcon !== release.icon ||
    editColor.hsla !== release.color;

  const handleUpdate = async () => {
    if (!hasChanges || isSaving) return;

    try {
      setIsSaving(true);
      await onUpdate({
        name: editName,
        slug: editSlug,
        icon: editIcon,
        color: editColor.hsla,
      });
    } finally {
      setIsSaving(false);
    }
  };

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
    </div>
  );
}
