import { Slot } from "@radix-ui/react-slot";
import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 font-bold",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        accent:
          "border bg-accent text-accent-foreground hover:bg-border/80 hover:border-border/80",
        primary:
          "border border-transparent hover:border-border bg-accent text-accent-foreground hover:bg-secondary rounded-lg",
        success:
          "border bg-success/10 border-success/20 text-accent-foreground hover:bg-success/30",

        ghost: "hover:bg-accent text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8 font-bold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  tooltipText?: string;
  tooltipDelayDuration?: number;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      tooltipText,
      tooltipDelayDuration = 0,
      tooltipSide = "top",
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const buttonElement = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );

    if (!tooltipText) {
      return buttonElement;
    }

    return (
      <TooltipProvider delayDuration={tooltipDelayDuration}>
        <Tooltip>
          <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
          <TooltipContent className="px-2 py-1 text-xs" side={tooltipSide}>
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
