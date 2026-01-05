import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { IconMoodPlus } from "@tabler/icons-react";
import { useState } from "react";
import { InlineLabel } from "../../shared/inlinelabel";

// Common reactions similar to GitHub/Linear/Discord
const REACTION_OPTIONS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "👎", label: "Thumbs down" },
  { emoji: "😄", label: "Laugh" },
  { emoji: "🎉", label: "Hooray" },
  { emoji: "😕", label: "Confused" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🚀", label: "Rocket" },
  { emoji: "👀", label: "Eyes" },
] as const;

export type ReactionEmoji = (typeof REACTION_OPTIONS)[number]["emoji"];

export interface Reaction {
  emoji: ReactionEmoji;
  count: number;
  reacted: boolean; // Whether current user has reacted
  users: schema.userType[]; // Users who reacted (for tooltip)
}

interface ReactionPickerProps {
  onSelect: (emoji: ReactionEmoji) => void;
  existingReactions?: ReactionEmoji[];
}

interface ReactionDisplayProps {
  reactions: Reaction[];
  onToggle: (emoji: ReactionEmoji) => void;
  onAddReaction: (emoji: ReactionEmoji) => void;
  className?: string;
}

// --------------------
// ReactionPicker - Popover with emoji grid
// --------------------
export function ReactionPicker({
  onSelect,
  existingReactions = [],
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="p-1 h-auto w-auto aspect-square data-[state=open]:bg-accent"
        >
          <IconMoodPlus size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1" align="end" sideOffset={4}>
        <div className="grid grid-cols-4 gap-1">
          {REACTION_OPTIONS.map(({ emoji, label }) => {
            const hasReaction = existingReactions.includes(emoji);
            return (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                aria-label={label}
                className={cn(
                  "h-8 w-8 p-0 text-lg hover:bg-accent border border-transparent transition-transform",
                  hasReaction && "bg-accent border-primary/20",
                )}
                onClick={() => {
                  onSelect(emoji);
                  setOpen(false);
                }}
              >
                {emoji}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --------------------
// ReactionDisplay - Shows reactions below comment (GitHub style)
// --------------------
export function ReactionDisplay({
  reactions,
  onToggle,
  onAddReaction,
  className,
}: ReactionDisplayProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const visibleReactions = reactions.filter((r) => r.count > 0);

  if (visibleReactions.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {visibleReactions.map((reaction) => (
        <Tooltip key={reaction.emoji} delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 py-0 text-sm gap-1 rounded-full border",
                "hover:bg-accent transition-colors",
                reaction.reacted
                  ? "bg-primary/10 border-primary/20 text-primary-foreground"
                  : "bg-accent/50 border-border",
              )}
              onClick={() => onToggle(reaction.emoji)}
            >
              <span className="text-base leading-none">{reaction.emoji}</span>
              <span className="text-xs font-medium">{reaction.count}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64 p-2">
            {reaction.users.length > 0 ? (
              <div className="flex flex-col gap-1">
                {reaction.users.slice(0, 5).map((user) => (
                  <InlineLabel
                    key={user.id}
                    text={user.name}
                    image={user.image}
                    className=""
                    avatarClassName=""
                  />
                ))}
                {reaction.users.length > 5 && (
                  <span className="text-xs text-muted-foreground ps-5">
                    and {reaction.users.length - 5} more
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs">
                {reaction.count} {reaction.count === 1 ? "person" : "people"}{" "}
                reacted
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Add reaction button inline */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full border border-dashed border-border hover:border-solid hover:bg-accent opacity-0 group-hover/timeline-item:opacity-100 data-[state=open]:opacity-100 transition-all"
          >
            <IconMoodPlus size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" sideOffset={4}>
          <div className="grid grid-cols-4 gap-1">
            {REACTION_OPTIONS.map(({ emoji, label }) => {
              const existing = reactions.find((r) => r.emoji === emoji);
              return (
                <Tooltip key={emoji} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 text-lg hover:bg-accent hover:scale-110 transition-transform",
                        existing?.reacted && "bg-accent ring-1 ring-primary/20",
                      )}
                      onClick={() => {
                        onAddReaction(emoji);
                        setPickerOpen(false);
                      }}
                    >
                      {emoji}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// --------------------
// useReactions - Mock hook for local state management
// --------------------
export function useReactions(
  commentId: string,
  currentUser: schema.userType | undefined,
) {
  // Mock state - in real implementation this would come from the backend
  const [reactions, setReactions] = useState<Reaction[]>([]);

  const toggleReaction = (emoji: ReactionEmoji) => {
    if (!currentUser) return;

    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji);
      if (existing) {
        // Toggle off if already reacted, otherwise toggle on
        if (existing.reacted) {
          const newCount = existing.count - 1;
          if (newCount === 0) {
            return prev.filter((r) => r.emoji !== emoji);
          }
          return prev.map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  count: newCount,
                  reacted: false,
                  users: r.users.filter((u) => u.id !== currentUser.id),
                }
              : r,
          );
        }
        return prev.map((r) =>
          r.emoji === emoji
            ? {
                ...r,
                count: r.count + 1,
                reacted: true,
                users: [...r.users, currentUser],
              }
            : r,
        );
      }
      // Add new reaction
      return [
        ...prev,
        { emoji, count: 1, reacted: true, users: [currentUser] },
      ];
    });
  };

  const existingEmojis = reactions.filter((r) => r.reacted).map((r) => r.emoji);

  return {
    reactions,
    toggleReaction,
    existingEmojis,
  };
}
