"use client";

import { IconCheck, IconCopy } from "@tabler/icons-react";
import { CheckIcon, CopyIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "../button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../tooltip";

export interface SimpleClipboardProps {
  textToCopy: string;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  children?: React.ReactNode;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconSize?: number;
  copiedDuration?: number;
  tooltipText?: string;
  tooltipCopiedText?: string;
  showTooltip?: boolean;
  copyIcon?: React.ReactNode;
  checkIcon?: React.ReactNode;
  checkIconClassName?: string;
  copyIconClassName?: string;
  onCopy?: () => void;
  onError?: (error: Error) => void;
  tooltipDelayDuration?: number;
  disabled?: boolean;
}

export default function SimpleClipboard({
  textToCopy,
  children,
  className,
  variant = "outline",
  size = "icon",
  iconSize = 16,
  copiedDuration = 1500,
  tooltipText = "Click to copy",
  tooltipCopiedText = "Copied!",
  tooltipSide = "top",
  showTooltip = true,
  copyIcon,
  checkIcon,
  checkIconClassName,
  copyIconClassName,
  onCopy,
  onError,
  tooltipDelayDuration = 0,
  disabled = false,
}: SimpleClipboardProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), copiedDuration);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to copy text");
      console.error("Failed to copy text: ", error);
      onError?.(error);
    }
  };

  const defaultCopyIcon = copyIcon || (
    <IconCopy size={iconSize} aria-hidden="true" />
  );
  const defaultCheckIcon = checkIcon || (
    <IconCheck
      className={cn(checkIconClassName)}
      size={iconSize}
      aria-hidden="true"
    />
  );

  const triggerElement = children ? (
    <button
      type="button"
      onClick={disabled || copied ? undefined : handleCopy}
      className="cursor-pointer border-none bg-transparent p-0"
      disabled={disabled || copied}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {children}
    </button>
  ) : (
    <Button
      variant={variant}
      size={size}
      className={cn("disabled:opacity-100", className)}
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      disabled={copied || disabled}
    >
      <div
        className={cn(
          "transition-all",
          copied ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      >
        {defaultCheckIcon}
      </div>
      <div
        className={cn(
          "absolute transition-all",
          copied ? "scale-0 opacity-0" : "scale-100 opacity-100",
          copyIconClassName,
        )}
      >
        {defaultCopyIcon}
      </div>
    </Button>
  );

  if (!showTooltip) {
    return triggerElement;
  }

  return (
    <TooltipProvider delayDuration={tooltipDelayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{triggerElement}</TooltipTrigger>
        <TooltipContent className="px-2 py-1 text-xs" side={tooltipSide}>
          {copied ? tooltipCopiedText : tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
