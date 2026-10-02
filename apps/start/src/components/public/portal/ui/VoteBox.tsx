import { Button } from "@/components/prosekit/ui/button";
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
  /** Small variant (40x48) for compact rows; default is 48x56. */
  size?: "md" | "sm";
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
    <Button
      type="button"
      aria-pressed={voted}
      aria-label={`Upvote, ${count} ${count === 1 ? "vote" : "votes"}`}
      disabled={disabled}
      onClick={handleClick}
      size={size == "md" ? "lg" : "sm"}
      className={cn(
        "aspect-square h-auto w-auto p-2",
        !voted && "bg-transparent",
        className,
      )}
      variant={voted ? "default" : "accent"}
      // className={cn(
      // 	"flex shrink-0 cursor-pointer flex-col items-center justify-center gap-px border text-muted-foreground outline-none transition-colors",
      // 	size === "sm" ? "h-12 w-10 rounded-lg" : "h-14 w-12 rounded-lg",
      // 	voted
      // 		? "border-primary/50 bg-primary/15 text-primary"
      // 		: "border-border bg-background hover:border-primary/50 hover:text-primary focus-visible:border-primary/50 focus-visible:text-primary",
      // 	disabled &&
      // 		"cursor-not-allowed opacity-50 hover:border-border hover:text-muted-foreground focus-visible:border-border focus-visible:text-muted-foreground",
      // 	className
      // )}
    >
      <IconChevronUp aria-hidden className="size-4" stroke={2} />
      <b
        className={cn(
          "font-semibold tabular-nums leading-[18px]",
          size === "sm" ? "text-[13px]" : "text-sm",
        )}
      >
        {formatCount(count)}
      </b>
    </Button>
  );
}
