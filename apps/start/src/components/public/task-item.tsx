"use client";

import type { schema } from "@repo/database";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import {
  extractHslValues,
  extractTaskText,
  formatDateCompact,
} from "@repo/util";
import {
  IconArrowUp,
  IconCalendar,
  IconChevronUp,
  IconCircleFilled,
  IconHash,
  IconMessage,
  IconMeterCube,
  IconUserOff,
} from "@tabler/icons-react";
import { nanoid } from "nanoid";
import { useRef } from "react";
import {
  useTaskViewManager,
  type FilterState,
} from "@/hooks/useTaskViewManager";
import { priorityConfig, statusConfig } from "@/components/tasks/shared/config";
import { RenderLabel } from "@/components/tasks/shared/label";
import { RenderCategory } from "@/components/tasks/shared";
import RenderIcon from "@/components/generic/RenderIcon";
import { useTaskDetailParam } from "@/hooks/useTasksSearchParams";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { InlineLabel } from "../tasks/shared/inlinelabel";
import { Separator } from "@repo/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

interface PublicTaskItemProps {
  task: schema.TaskWithLabels;
  categories?: schema.categoryType[];
  voted?: boolean;
  onVote?: () => void;
}

export function PublicTaskItem({
  task,
  categories = [],
  voted,
  onVote,
}: PublicTaskItemProps) {
  const status = statusConfig[task.status as keyof typeof statusConfig];
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
  const preventClickRef = useRef(false);

  // Consolidated task view state management
  const { applyFilter } = useTaskViewManager();
  const [, setTaskContentOpen] = useTaskDetailParam();

  const handleCategoryClick = (categoryId: string) => {
    preventClickRef.current = true;
    setTimeout(() => {
      preventClickRef.current = false;
    }, 200);

    const categoryFilter: FilterState = {
      groups: [
        {
          id: `category-${categoryId}-group`,
          operator: "AND",
          conditions: [
            {
              id: `category-any-${categoryId}`,
              field: "category",
              operator: "any",
              value: categoryId,
            },
          ],
        },
      ],
      operator: "AND",
    };
    applyFilter(categoryFilter);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking on interactive elements
    if ((e.target as HTMLElement).closest("[data-no-propagate]")) {
      e.preventDefault();
      return;
    }
    if (preventClickRef.current) {
      e.preventDefault();
      preventClickRef.current = false;
      return;
    }
    setTaskContentOpen(task.shortId);
  };

  const descriptionPreview = extractTaskText(task.description);
  const taskCommentsCountString = task.comments?.length.toString() || "0";

  return (
    <Tile className="md:w-full flex-col gap-3 items-start p-6 bg-accent hover:bg-secondary">
      <div className="flex items-center justify-between w-full gap-9">
        <TileHeader className="w-full">
          <TileTitle asChild>
            <Label variant={"heading"} className="text-lg font-bold">
              {task.title}
            </Label>
          </TileTitle>
          {descriptionPreview && (
            <TileDescription className="text-sm text-muted-foreground line-clamp-2">
              {descriptionPreview}
            </TileDescription>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <InlineLabel
              text={formatDateCompact(task.createdAt as Date)}
              icon={<IconCalendar className="size-3" />}
              className=" ps-5 pe-1"
            />

            <InlineLabel
              text={taskCommentsCountString}
              icon={<IconMessage className="size-3" />}
              className="bg-accent rounded-lg ps-5 pe-1"
            />
            <InlineLabel
              text={status?.label || task.status}
              icon={status?.icon(cn(status?.className, "size-3"))}
              className={cn("bg-accent rounded-lg ps-5 pe-1")}
              style={{
                background: `hsla(${extractHslValues(status.hsla)}, 0.1)`,
              }}
            />
            {(() => {
              const category = categories.find((c) => c.id === task.category);
              return category ? (
                <InlineLabel
                  text={category.name}
                  className={cn("bg-accent rounded-lg ps-5 pe-1")}
                  style={{
                    background: category.color
                      ? `hsla(${extractHslValues(category.color)}, 0.1)`
                      : undefined,
                  }}
                  icon={
                    <RenderIcon
                      iconName={category.icon || "IconCategory"}
                      size={12}
                      color={category.color || undefined}
                      raw
                    />
                  }
                />
              ) : null;
            })()}
            {task.labels && task.labels.length > 0 && (
              <>
                <InlineLabel
                  text={task.labels[0]?.name || ""}
                  className={cn("bg-accent rounded-lg ps-5 pe-1")}
                  icon={
                    <IconCircleFilled
                      className={cn("size-3")}
                      style={{
                        color: task.labels[0]?.color || "var(--color-accent)",
                      }}
                    />
                  }
                />
                {task.labels.length > 1 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <InlineLabel
                        text={`+${task.labels.length - 1} more`}
                        className={cn("bg-accent rounded-lg ps-5 pe-1")}
                        icon={
                          <div className="flex -space-x-1.5">
                            {task.labels.slice(1, 4).map((label) => (
                              <IconCircleFilled
                                key={label.id + nanoid(5)}
                                className="size-3"
                                style={{
                                  color: label.color || "var(--foreground)",
                                }}
                              />
                            ))}
                          </div>
                        }
                      />
                    </TooltipTrigger>
                    <TooltipContent className="z-50">
                      {task.labels.map((label) => (
                        <div key={label.id} className="flex items-center gap-1">
                          <IconCircleFilled
                            className="size-3"
                            style={{
                              color: label.color || "var(--foreground)",
                            }}
                          />
                          <span className="text-sm">{label.name}</span>
                        </div>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
            <InlineLabel
              text={task.shortId?.toString() || ""}
              icon={<IconHash className="size-3" />}
              className=" ps-5 pe-1"
            />
          </div>
        </TileHeader>
        <TileAction className="justify-center">
          <Button
            variant="primary"
            data-no-propagate
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVote?.();
            }}
            className={cn(
              "size-12 flex flex-col gap-0 aspect-square border-border font-bold bg-transparent hover:bg-primary/10 hover:border-primary",
              voted && "border-primary bg-primary/10",
            )}
          >
            <IconChevronUp />
            {task.voteCount}
          </Button>
        </TileAction>
      </div>
    </Tile>
  );
}
