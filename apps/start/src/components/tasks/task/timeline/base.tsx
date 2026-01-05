import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import {
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@repo/ui/components/tomui/timeline";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { formatDateTime, formatDateTimeFromNow } from "@repo/util";
import { IconCheck, IconLock, IconX } from "@tabler/icons-react";
import type { NodeJSON } from "prosekit/core";
import Editor from "@/components/prosekit/editor";
import { InlineLabel } from "../../shared/inlinelabel";
import { ReactionDisplay, type ReactionEmoji } from "./reactions";
import type { TimelineItemWrapperProps } from "./types";
import { Separator } from "@repo/ui/components/separator";

export function TimelineItemWrapper({
  item,
  icon: Icon,
  color,
  children,
  availableUsers,
  categories,
  tasks,
  actionButtons,
  isEditing,
  onContentChange,
  onSave,
  onCancel,
  isSaving,
  canSave,
  first,
  hideContent,
  onReactionToggle,
}: TimelineItemWrapperProps & {
  onReactionToggle?: (emoji: ReactionEmoji) => void;
}) {
  return (
    <TimelineItem
      key={item.id}
      step={2}
      className={cn(
        "group-data-[orientation=vertical]/timeline:ms-10 group-data-[orientation=vertical]/timeline:not-last:pb-4",
        first && "ms-0!",
      )}
    >
      {!first && (
        <TimelineHeader>
          <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.5rem-0.25rem)] group-data-[orientation=vertical]/timeline:translate-y-6.5" />
          <TimelineTitle className="mt-0.5">
            <Label
              variant={"description"}
              className="text-foreground items-center flex flex-wrap gap-2"
            >
              <span>{children}</span>
              {(!item.content || hideContent) && (
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <Label variant={"description"} className="text-foreground">
                      {" "}
                      {formatDateTimeFromNow(item.createdAt as Date)}
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {formatDateTime(item.createdAt as Date)}
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>
          </TimelineTitle>

          <TimelineIndicator className="bg-primary/10 group-data-completed/timeline-item:bg-primary group-data-completed/timeline-item:text-primary-foreground flex size-6 items-center justify-center border-none group-data-[orientation=vertical]/timeline:-left-7">
            <Avatar className={cn("h-6 w-6 rounded-full", color)}>
              <AvatarFallback className="rounded-full bg-transparent">
                <Icon size={16} />
              </AvatarFallback>
            </Avatar>
          </TimelineIndicator>
        </TimelineHeader>
      )}
      {item.content && !hideContent ? (
        <TimelineContent
          className={cn(
            "text-foreground rounded-lg border bg-accent/50 relative overflow-hidden px-4 py-3 group/timeline-item",
            item.visibility === "internal" && "border-primary/30 bg-primary/5",
            first && "border-0 bg-transparent p-0",
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              {!first && (
                <InlineLabel
                  className="ps-6"
                  avatarClassName="size-4!"
                  text={item.actor?.name || "Unknown"}
                  image={item.actor?.image || ""}
                  textNode={
                    <div className="flex items-center gap-3">
                      <Label
                        className="text-base text-foreground"
                        variant={"description"}
                      >
                        {item.actor?.name || "Unknown"}
                      </Label>
                      <Tooltip delayDuration={500}>
                        <TooltipTrigger asChild>
                          <Label variant={"description"}>
                            {" "}
                            {formatDateTimeFromNow(item.createdAt as Date)}
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {formatDateTime(item.createdAt as Date)}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  }
                />
              )}

              <div className="flex items-center gap-1 ml-auto">
                {actionButtons && (
                  <div className="flex items-center gap-1 opacity-0 group-hover/timeline-item:opacity-100 has-data-[state=open]:opacity-100 transition-all">
                    {actionButtons}
                  </div>
                )}
                {item.visibility === "internal" && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-1 h-auto w-auto aspect-square data-[state=open]:bg-accent"
                      >
                        <IconLock size={16} />
                      </Button>
                      {/*<Badge
                        variant={"secondary"}
                        className="w-fit bg-transparent pointer-events-none rounded-lg gap-1 text-sm"
                      >
                        <IconLock className="size-4" />
                      </Badge>*/}
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        This is an internal comment. Only team members can see
                        it.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            {isEditing ? (
              <>
                <Editor
                  defaultContent={item.content as NodeJSON}
                  users={availableUsers}
                  categories={categories}
                  tasks={tasks}
                  onChange={onContentChange}
                  submit={onSave}
                />
                <div className="flex items-center gap-2 mt-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSaving}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <IconX size={16} />
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving || !canSave}
                  >
                    <IconCheck size={16} />
                    {isSaving ? "Saving..." : "Update comment"}
                  </Button>
                </div>
              </>
            ) : (
              <Editor
                readonly
                defaultContent={item.content}
                users={availableUsers}
                categories={categories}
                tasks={tasks}
              />
            )}
            {/* Reactions display */}
            {item.reactions?.reactions &&
              Object.keys(item.reactions.reactions).length > 0 && (
                <ReactionDisplay
                  reactions={item.reactions.reactions}
                  toggleReaction={(emoji) =>
                    onReactionToggle ? onReactionToggle(emoji) : ""
                  }
                  users={availableUsers}
                />
              )}
          </div>
        </TimelineContent>
      ) : null}
    </TimelineItem>
  );
}

export function AvatarWithName({
  name,
  image,
  className,
  custom,
}: {
  name: string;
  image: string;
  className?: string;
  custom?: React.ReactNode;
}) {
  return custom ? (
    custom
  ) : (
    <Badge
      variant={"secondary"}
      className={cn(
        "inline-flex items-center gap-1 justify-center h-5 border border-border",
        className,
      )}
    >
      <Avatar className={cn("rounded-full bg-primary h-3 w-3")}>
        <AvatarImage src={image || "/avatar.jpg"} alt={name} />
        <AvatarFallback className="rounded-full bg-transparent uppercase">
          {name.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <span>{name}</span>
    </Badge>
  );
}
