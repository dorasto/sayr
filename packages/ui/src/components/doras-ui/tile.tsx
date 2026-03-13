"use client";

import { Slot } from "@radix-ui/react-slot";
import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const tileVariants = cva(
  "rounded-lg p-3 transition-all flex items-center justify-between gap-9 md:w-fit w-full",
  {
    variants: {
      variant: {
        default: "bg-card",
        transparent: "bg-transparent",
        outline: "border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Context to share variant with children
const TileContext = React.createContext<{
  variant?: "default" | "transparent" | "outline" | null;
}>({
  variant: "default",
});

const useTileContext = () => {
  const context = React.useContext(TileContext);
  return context;
};

function Tile({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof tileVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "div";

  return (
    <TileContext.Provider value={{ variant }}>
      <Comp className={cn(tileVariants({ variant, className }))} {...props} />
    </TileContext.Provider>
  );
}

interface TileHeaderProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
}
function TileHeader({
  className,
  children,
  asChild = false,
  ...props
}: TileHeaderProps) {
  const Comp = asChild ? Slot : "div";

  // Separate TileIcon from other children
  const childrenArray = React.Children.toArray(children);
  const tileIcon = childrenArray.find(
    (child) => React.isValidElement(child) && child.type === TileIcon,
  );
  const otherChildren = childrenArray.filter(
    (child) => React.isValidElement(child) && child.type !== TileIcon,
  );

  return (
    <Comp
      className={cn("flex items-center gap-3 min-w-0", className)}
      {...props}
    >
      {tileIcon && <>{tileIcon}</>}
      <div className="flex flex-col flex-1 min-w-0">{otherChildren}</div>
    </Comp>
  );
}

function TileIcon({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "div";
  const { variant } = useTileContext();

  return (
    <Comp
      className={cn(
        "shrink-0 [&_svg]:size-4 p-1 rounded",
        variant === "outline" ? "border" : "bg-accent",
        className,
      )}
      {...props}
    />
  );
}

function TileTitle({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "div";

  return <Comp className={cn("font-medium text-base", className)} {...props} />;
}

function TileDescription({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function TileAction({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp className={cn("flex items-center gap-2", className)} {...props} />
  );
}

export {
  Tile,
  TileHeader,
  TileTitle,
  TileIcon,
  TileDescription,
  TileAction,
  tileVariants,
};
