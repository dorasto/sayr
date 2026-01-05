import { useState, useMemo } from "react";
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
import { InlineLabel } from "../../shared/inlinelabel";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";

// --------------------------------
// constants & types
// --------------------------------
export const REACTION_OPTIONS = [
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

interface ReactionPickerProps {
  onSelect: (emoji: ReactionEmoji) => void;
  existingReactions?: ReactionEmoji[];
}

interface ReactionDisplayProps {
  reactions?: Record<
    string,
    {
      count: number;
      users: string[];
    }
  >;
  toggleReaction: (emoji: ReactionEmoji) => void;
  className?: string;
  users?: schema.userType[] | undefined;
}

// --------------------------------
// ReactionPicker (simple emoji grid)
// --------------------------------
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
                  "h-8 w-8 p-0 text-lg hover:bg-accent transition-transform",
                  hasReaction && "bg-accent ring-1 ring-primary/10",
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

// --------------------------------
// ReactionDisplay
// --------------------------------
export function ReactionDisplay({
  reactions,
  toggleReaction,
  className,
  users,
}: ReactionDisplayProps) {
  const { value: Newaccount } = useStateManagement<schema.userType>(
    "account",
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const visibleReactions = useMemo(() => {
    const record = reactions ?? {};
    return Object.entries(record).map(([emoji, info]) => ({
      emoji,
      count: info.count,
      reacted: Newaccount && info.users.includes(Newaccount.id),
      userObjs: info.users
        .map((id) => users?.find((u) => u.id === id))
        .filter(Boolean) as schema.userType[],
    }));
  }, [reactions, Newaccount, users]);

  const reactedEmojis = visibleReactions
    .filter((r) => r.reacted)
    .map((r) => r.emoji as ReactionEmoji);

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {visibleReactions.map((r) => (
        <Tooltip key={r.emoji} delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 py-0 text-sm gap-1 rounded-full border hover:bg-accent transition-colors",
                r.reacted
                  ? "bg-primary/10 border-primary/20 text-primary-foreground"
                  : "bg-accent/50 border-border",
              )}
              onClick={() => toggleReaction(r.emoji as ReactionEmoji)}
            >
              <span className="text-base leading-none">{r.emoji}</span>
              <span className="text-xs font-medium">{r.count}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64 p-2">
            {r.userObjs.length ? (
              <div className="flex flex-col gap-1">
                {r.userObjs.slice(0, 5).map((u) => (
                  <InlineLabel
                    key={u.id}
                    text={u.name}
                    image={u.image ?? undefined}
                  />
                ))}
                {r.userObjs.length > 5 && (
                  <span className="text-xs text-muted-foreground ps-5">
                    and {r.userObjs.length - 5} more
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs">
                {r.count} {r.count === 1 ? "person" : "people"} reacted
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      ))}

      {/* Add reaction */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full border border-dashed border-border hover:border-solid hover:bg-accent"
          >
            <IconMoodPlus size={14} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start" sideOffset={4}>
          <div className="grid grid-cols-4 gap-1">
            {REACTION_OPTIONS.map(({ emoji, label }) => (
              <Tooltip key={emoji} delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 text-lg hover:bg-accent hover:scale-110 transition-transform",
                      reactedEmojis.includes(emoji) &&
                      "bg-accent ring-1 ring-primary/20",
                    )}
                    onClick={() => {
                      toggleReaction(emoji);
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
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}