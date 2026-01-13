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
    <Tile className="md:w-full flex-col gap-3 items-start p-6">
      <div className="flex items-center justify-between w-full gap-9">
        <TileHeader className="w-full">
          <TileTitle asChild>
            <Label variant={"heading"} className="text-lg font-bold">
              {task.title}
              <span className="text-xs text-muted-foreground">
                #{task.shortId}
              </span>
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
              "size-12 flex flex-col gap-0 aspect-square font-bold",
              voted && "border-primary bg-primary/10",
            )}
          >
            <IconChevronUp />
            {task.voteCount}
          </Button>
        </TileAction>
      </div>
    </Tile>
    // <div
    //   className={cn(
    //     "block cursor-pointer w-full text-left bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded",
    //   )}
    //   onClick={handleClick}
    // >
    //   <div
    //     className={cn(
    //       "px-2 group/list-block h-11 max-h-11 relative flex gap-3 bg-transparent hover:bg-accent py-3 text-sm transition-colors flex-row items-center rounded",
    //     )}
    //   >
    //     <div className="flex gap-2 w-full truncate">
    //       <div className="flex flex-grow items-center gap-1 truncate">
    //         <div className="flex items-center gap-1">
    //           <div
    //             className="h-4 flex items-center gap-1.5 rounded text-xs p-0.5"
    //             title={priority?.label}
    //           >
    //             {priority?.icon(`h-3.5 w-3.5 ${priority?.className || ""}`)}
    //           </div>

    //           <div className="shrink-0 min-w-9 w-9 max-w-9">
    //             <div className="flex items-center space-x-2">
    //               <span className="text-xs font-medium text-muted-foreground truncate">
    //                 #{task.shortId}
    //               </span>
    //             </div>
    //           </div>
    //         </div>

    //         <div
    //             className="size-4 grid place-items-center shrink-0"
    //             title={status?.label}
    //         >
    //             {status?.icon(`h-3.5 w-3.5 ${status?.className || ""}`)}
    //         </div>

    //         <p className="truncate cursor-pointer text-base text-foreground w-fit">
    //           {task.title}{" "}
    //         </p>
    //       </div>
    //     </div>
    //     <div className="flex shrink-0 items-center gap-2">
    //       <div className="relative flex flex-wrap grow shrink-0 items-center gap-2 whitespace-nowrap">
    //         {task.category &&
    //           (() => {
    //             const category = categories.find((c) => c.id === task.category);
    //             return category ? (
    //               <button
    //                 type="button"
    //                 onClick={(e) => {
    //                   e.preventDefault();
    //                   e.stopPropagation();
    //                   handleCategoryClick(category.id);
    //                 }}
    //                 data-no-propagate
    //                 className="cursor-pointer"
    //               >
    //                 <RenderCategory category={category} />
    //               </button>
    //             ) : null;
    //           })()}
    //         {task.labels && task.labels.length > 0 && (
    //           <div className="hidden sm:flex h-5 gap-1 max-w-[400px] overflow-x-auto">
    //             {task.labels.slice(0, 3).map((label) => (
    //               <RenderLabel
    //                 label={label}
    //                 key={label.id + nanoid(5)}
    //                 data-no-propagate
    //               />
    //             ))}
    //             {task.labels.length > 3 && (
    //               <Badge
    //                 variant="secondary"
    //                 className="flex items-center justify-center gap-1 bg-accent text-xs h-5 border border-border rounded-2xl truncate group/label w-fit relative shrink-0"
    //               >
    //                 <div className="flex -space-x-1.5">
    //                   {task.labels.slice(3).map((label) => (
    //                     <IconCircleFilled
    //                       key={label.id + nanoid(5)}
    //                       className="h-3 w-3"
    //                       style={{
    //                         color: label.color || "var(--foreground)",
    //                       }}
    //                     />
    //                   ))}
    //                 </div>
    //                 +{task.labels.length - 3} more
    //               </Badge>
    //             )}
    //           </div>
    //         )}
    //         <div
    //             className="flex items-center"
    //         >
    //             {task.assignees && task.assignees.length > 0 ? (
    //                 task.assignees.length === 1 ? (
    //                   <Avatar className={cn("rounded-full h-5 w-5")}>
    //                     <AvatarImage
    //                       src={task.assignees[0]?.image || "/avatar.jpg"}
    //                       alt={task.assignees[0]?.name}
    //                     />
    //                     <AvatarFallback className="rounded-full bg-accent uppercase text-xs">
    //                       {task.assignees[0]?.name.slice(0, 2)}
    //                     </AvatarFallback>
    //                   </Avatar>
    //                 ) : (
    //                   <div className="flex -space-x-2">
    //                     {task.assignees.slice(0, 3).map((assignee, index) => (
    //                       <Avatar
    //                         key={assignee.id + nanoid(5)}
    //                         className={cn(
    //                           "rounded-full h-5 w-5",
    //                           index > 0 && "relative",
    //                         )}
    //                         style={{ zIndex: task.assignees.length - index }}
    //                       >
    //                         <AvatarImage
    //                           src={assignee?.image || "/avatar.jpg"}
    //                           alt={assignee?.name}
    //                         />
    //                         <AvatarFallback className="rounded-full bg-accent uppercase text-xs">
    //                           {assignee?.name.slice(0, 2)}
    //                         </AvatarFallback>
    //                       </Avatar>
    //                     ))}
    //                     {task.assignees.length > 3 && (
    //                       <div className="flex items-center justify-center rounded-full h-5 w-5 bg-muted border-2 border-background text-xs font-medium text-muted-foreground relative">
    //                         +{task.assignees.length - 3}
    //                       </div>
    //                     )}
    //                   </div>
    //                 )
    //             ) : (
    //               <div
    //                 className="flex items-center rounded-full bg-accent aspect-square place-content-center border h-5 w-5"
    //               >
    //                 <IconUserOff className="h-3 w-3 shrink-0" />
    //               </div>
    //             )}
    //         </div>
    //         <span className="text-xs text-muted-foreground truncate">
    //           {formatDateCompact(task.createdAt as Date)}
    //         </span>
    //       </div>
    //     </div>
    //   </div>
    // </div>
  );
}
