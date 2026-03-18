"use client";

import * as React from "react";
import { toast as sonnerToast } from "sonner";
import { cn } from "../lib/utils"; // assume you have a cn helper; if not can inline
import { Button } from "./button";

/**
 * Basic shape for a headless toast. Keep minimal. Expand later if needed.
 */
export interface HeadlessToastAction {
  label: string;
  onClick?: () => void;
}

export interface HeadlessToastOptions {
  id?: string | number;
  title?: string;
  description?: string;
  action?: HeadlessToastAction;
  /** Provide custom icon element if desired */
  icon?: React.ReactNode | null;
  /** Variant defines styling; add more later */
  variant?: HeadlessToastVariant;
  /** Arbitrary className overrides root */
  className?: string;
  /** Duration in milliseconds. Set to Infinity for persistent toasts */
  duration?: number;
}

export type HeadlessToastVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading";

const variantClasses: Record<HeadlessToastVariant, string> = {
  default: "border bg-card text-foreground",
  success: "border bg-card text-foreground border-success/70",
  error: "border bg-card text-foreground border-destructive/70",
  warning: "border bg-card text-foreground border-amber-500",
  info: "border bg-card text-foreground",
  loading: "border bg-card text-foreground",
};

// Global default icons registry (module-scoped). Users can override via setHeadlessToastIcons.
let headlessToastIcons: Partial<
  Record<HeadlessToastVariant, React.ReactNode | null>
> = {};

export function setHeadlessToastIcons(
  map: Partial<Record<HeadlessToastVariant, React.ReactNode | null>>,
) {
  headlessToastIcons = { ...headlessToastIcons, ...map };
}

/** Optional lightweight config component to declare default icons inside app tree */
export function HeadlessToastConfig(props: {
  icons: Partial<Record<HeadlessToastVariant, React.ReactNode | null>>;
  children?: React.ReactNode;
}) {
  React.useEffect(() => {
    setHeadlessToastIcons(props.icons);
  }, [props.icons]);
  return props.children ?? null;
}

/** Root visual component. Animations & accessibility handled by sonner; we just style content. */
export function HeadlessToast(
  props: Required<Pick<HeadlessToastOptions, "id">> & HeadlessToastOptions,
) {
  const {
    id,
    title,
    description,
    action,
    icon,
    variant = "default",
    className,
  } = props;

  // Resolve icon precedence: explicit icon prop > registered icon for variant > nothing.
  const resolvedIcon = icon === undefined ? headlessToastIcons[variant] : icon;

  return (
    <div
      className={cn(
        "flex flex-col md:max-w-96 w-80 items-start gap-3 rounded-lg p-3 shadow-md transition-colors", // base
        variantClasses[variant],
        className,
      )}
      data-variant={variant}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {resolvedIcon ? (
            <div className="mt-0.5 shrink-0">{resolvedIcon}</div>
          ) : null}
          {title ? (
            <p className={cn("text-sm font-bold leading-none line-clamp-1")}>
              {title}
            </p>
          ) : null}
        </div>
        {description ? (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        ) : null}
      </div>
      {action?.label ? (
        <Button
          type="button"
          onClick={() => {
            action.onClick?.();
            sonnerToast.dismiss(id);
          }}
          className="shrink-0 py-1"
          size={"sm"}
          variant={"primary"}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Public helper to show a headless toast. Minimal ergonomic wrapper.
 * Accepts same options as component minus mandatory id.
 */
export function headlessToast(opts: HeadlessToastOptions) {
  const { id, duration, ...componentOptions } = opts;
  return sonnerToast.custom(
    (toastId) => <HeadlessToast id={toastId} {...componentOptions} />,
    {
      id,
      duration,
    },
  );
}

// Variant specific helpers (optional small sugar)
headlessToast.success = (options: Omit<HeadlessToastOptions, "variant">) =>
  headlessToast({ variant: "success", ...options });
headlessToast.error = (options: Omit<HeadlessToastOptions, "variant">) =>
  headlessToast({ variant: "error", ...options });
headlessToast.warning = (options: Omit<HeadlessToastOptions, "variant">) =>
  headlessToast({ variant: "warning", ...options });
headlessToast.info = (options: Omit<HeadlessToastOptions, "variant">) =>
  headlessToast({ variant: "info", ...options });
headlessToast.loading = (options: Omit<HeadlessToastOptions, "variant">) =>
  headlessToast({ variant: "loading", ...options });
headlessToast.dismiss = (id?: string | number) => sonnerToast.dismiss(id);

export type { HeadlessToastOptions as ToastOptions };
