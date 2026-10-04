import { cn } from "@repo/ui/lib/utils";
import { formatCount } from "@repo/util";
import { IconChevronUp } from "@tabler/icons-react";
import type { MouseEvent } from "react";

interface VoteBoxProps {
  count: number;
  voted: boolean;
  onToggle?: () => void;
  /** Voting closed (canceled posts). */
  disabled?: boolean;
  /** `sm` is 40x48, `md` (default) 48x56; `chip` is an inline pill the size of the board's status pill. */
  size?: "md" | "sm" | "chip";
  className?: string;
}

/** Upvote toggle for list rows. Never login-gated; stops the click so it doesn't open the row. */
export function VoteBox({
  count,
  voted,
  onToggle,
  disabled,
  size = "md",
  className,
}: VoteBoxProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) onToggle?.();
  };

  return (
    <button
      type="button"
      aria-pressed={voted}
      aria-label={`Upvote, ${count} ${count === 1 ? "vote" : "votes"}`}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "flex shrink-0 cursor-pointer items-center justify-center rounded-lg border outline-none transition-colors",
        size === "chip"
          ? "gap-1 px-1.5 py-0.5 text-xs"
          : "flex-col gap-px",
        size === "sm" && "h-12 w-10",
        size === "md" && "h-14 w-12",
        voted
          ? "border-primary/50 bg-primary/15 text-primary"
          : cn(
              "border-border text-muted-foreground hover:border-primary/50 hover:text-primary focus-visible:border-primary/50 focus-visible:text-primary",
              size !== "chip" && "bg-background",
            ),
        disabled &&
          "cursor-not-allowed opacity-50 hover:border-border hover:text-muted-foreground",
        className,
      )}
    >
      <IconChevronUp
        aria-hidden
        className={size === "chip" ? "size-3.5" : "size-4"}
        stroke={2}
      />
      <b
        className={cn(
          "font-semibold tabular-nums",
          size === "chip" && "font-medium",
          size === "sm" && "text-[13px] leading-[18px]",
          size === "md" && "text-sm leading-[18px]",
        )}
      >
        {formatCount(count)}
      </b>
    </button>
  );
}
