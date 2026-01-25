"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { extractHslValues } from "@repo/util";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { IconCalendarEvent, IconCheck, IconX } from "@tabler/icons-react";
import { formatDate } from "@repo/util";
import type { schema } from "@repo/database";
import { useState, useEffect } from "react";
import IconPicker from "@/components/generic/icon-picker";
import RenderIcon from "@/components/generic/RenderIcon";
import { releaseStatusConfig, RELEASE_STATUS_ORDER } from "./config";

interface ReleaseHeaderProps {
  release: schema.ReleaseWithTasks;
  onStatusUpdate: (status: schema.releaseType["status"]) => void;
  onTargetDateUpdate: (date: Date | null) => void;
  onReleasedAtUpdate: (date: Date | null) => void;
  onUpdate: (data: {
    name: string;
    slug: string;
    icon?: string;
    color?: string;
  }) => void;
}

export function ReleaseHeader({
  release,
  onStatusUpdate,
  onTargetDateUpdate,
  onReleasedAtUpdate,
  onUpdate,
}: ReleaseHeaderProps) {
  const [editName, setEditName] = useState(release.name);
  const [editSlug, setEditSlug] = useState(release.slug);
  const [editIcon, setEditIcon] = useState(release.icon || "IconRocket");
  const [editColor, setEditColor] = useState({
    hsla: release.color || "#3B82F6",
    hex: release.color || "#3B82F6",
  });

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

  const handleIconChange = (value: string) => {
    setEditIcon(value);
    onUpdate({
      name: editName,
      slug: editSlug,
      icon: value,
      color: editColor.hsla,
    });
  };

  const handleColorChange = (color: { hsla: string; hex: string }) => {
    setEditColor(color);
    onUpdate({
      name: editName,
      slug: editSlug,
      icon: editIcon,
      color: color.hsla,
    });
  };

  const handleNameBlur = () => {
    if (editName !== release.name && editName.trim()) {
      onUpdate({
        name: editName,
        slug: editSlug,
        icon: editIcon,
        color: editColor.hsla,
      });
    } else if (!editName.trim()) {
      // Reset to original if empty
      setEditName(release.name);
    }
  };

  const handleSlugBlur = () => {
    if (editSlug !== release.slug && editSlug.trim()) {
      onUpdate({
        name: editName,
        slug: editSlug,
        icon: editIcon,
        color: editColor.hsla,
      });
    } else if (!editSlug.trim()) {
      // Reset to original if empty
      setEditSlug(release.slug);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleSlugKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Title Input with Icon */}
      <div className="relative flex items-center ">
        {/* Icon Popover */}
        <Popover modal>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto w-auto p-0 border-transparent rounded-lg overflow-hidden shrink-0"
            >
              <div
                className="p-1 rounded-lg"
                style={{
                  background: editColor.hsla
                    ? `hsla(${extractHslValues(editColor.hsla)}, 0.2)`
                    : undefined,
                }}
              >
                <RenderIcon
                  iconName={editIcon}
                  size={20}
                  color={editColor.hsla || undefined}
                  raw
                />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-64 md:w-96">
            <div className="flex flex-col gap-3">
              <div className="p-3">
                <ColorPickerCustom
                  onChange={handleColorChange}
                  defaultValue={editColor.hex}
                  height={100}
                />
              </div>
              <div className="px-3">
                <IconPicker
                  value={editIcon}
                  update={handleIconChange}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Title Input */}
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          variant={"ghost"}
          className="focus-visible:bg-transparent text-xl! font-bold py-0 flex-1"
          placeholder="Release name"
        />
      </div>

      {/* Slug Input */}
      <Input
        value={editSlug}
        onChange={(e) => setEditSlug(e.target.value)}
        onBlur={handleSlugBlur}
        onKeyDown={handleSlugKeyDown}
        variant={"ghost"}
        // className="text-sm text-muted-foreground border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-1"
        className="focus-visible:bg-transparent text-muted-foreground text-sm! py-0"
        placeholder="release-slug"
      />

      {/* Actions Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge
              className={cn(
                "border rounded-lg cursor-pointer gap-1.5",
                releaseStatusConfig[release.status].badgeClassName,
              )}
            >
              {releaseStatusConfig[release.status].icon("w-3 h-3")}
              {releaseStatusConfig[release.status].label}
            </Badge>
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

        {/* Target Date */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 gap-1.5 text-xs",
                release.targetDate
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <IconCalendarEvent className="w-3 h-3" />
              {release.targetDate
                ? formatDate(release.targetDate)
                : "Set target date"}
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
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => onTargetDateUpdate(null)}
                >
                  <IconX className="w-3 h-3 mr-1" />
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Released Date */}
        {release.releasedAt && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1.5 text-xs text-green-600"
              >
                <IconCheck className="w-3 h-3" />
                Released: {formatDate(release.releasedAt)}
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
              <div className="p-2 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => onReleasedAtUpdate(null)}
                >
                  <IconX className="w-3 h-3 mr-1" />
                  Clear date
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
