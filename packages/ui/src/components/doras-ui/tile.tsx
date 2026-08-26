"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@repo/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const tileVariants = cva("rounded-xl p-3 transition-all flex items-center justify-between gap-9 md:w-fit w-full", {
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
});

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
	children,
	...props
}: React.ComponentProps<"div"> &
	VariantProps<typeof tileVariants> & {
		asChild?: boolean;
	}) {
	return (
		<TileContext.Provider value={{ variant }}>
			{useRender({
				defaultTagName: "div",
				render: asChild ? (children as React.ReactElement) : undefined,
				props: mergeProps<"div">(
					{ className: cn(tileVariants({ variant, className })) } as React.ComponentProps<"div">,
					asChild ? props : { ...props, children }
				),
			})}
		</TileContext.Provider>
	);
}

interface TileHeaderProps extends React.ComponentProps<"div"> {
	asChild?: boolean;
}
function TileHeader({ className, children, asChild = false, ...props }: TileHeaderProps) {
	// Separate TileIcon from other children
	const childrenArray = React.Children.toArray(children);
	const tileIcon = childrenArray.find((child) => React.isValidElement(child) && child.type === TileIcon);
	const otherChildren = childrenArray.filter((child) => React.isValidElement(child) && child.type !== TileIcon);

	const composedChildren = (
		<>
			{tileIcon && <>{tileIcon}</>}
			<div className="flex flex-col flex-1 min-w-0">{otherChildren}</div>
		</>
	);

	return useRender({
		defaultTagName: "div",
		render: asChild ? (children as React.ReactElement) : undefined,
		props: mergeProps<"div">(
			{ className: cn("flex items-center gap-3 min-w-0", className) } as React.ComponentProps<"div">,
			asChild ? props : { ...props, children: composedChildren }
		),
	});
}

function TileIcon({
	className,
	asChild = false,
	children,
	...props
}: React.ComponentProps<"div"> & {
	asChild?: boolean;
}) {
	const { variant } = useTileContext();

	return useRender({
		defaultTagName: "div",
		render: asChild ? (children as React.ReactElement) : undefined,
		props: mergeProps<"div">(
			{
				className: cn(
					"shrink-0 [&_svg]:size-4 p-1 rounded",
					variant === "outline" ? "border" : "bg-accent",
					className
				),
			} as React.ComponentProps<"div">,
			asChild ? props : { ...props, children }
		),
	});
}

function TileTitle({
	className,
	asChild = false,
	children,
	...props
}: React.ComponentProps<"div"> & {
	asChild?: boolean;
}) {
	return useRender({
		defaultTagName: "div",
		render: asChild ? (children as React.ReactElement) : undefined,
		props: mergeProps<"div">(
			{ className: cn("font-medium text-base", className) } as React.ComponentProps<"div">,
			asChild ? props : { ...props, children }
		),
	});
}

function TileDescription({
	className,
	asChild = false,
	children,
	...props
}: React.ComponentProps<"span"> & {
	asChild?: boolean;
}) {
	return useRender({
		defaultTagName: "span",
		render: asChild ? (children as React.ReactElement) : undefined,
		props: mergeProps<"span">(
			{ className: cn("text-sm text-muted-foreground", className) } as React.ComponentProps<"span">,
			asChild ? props : { ...props, children }
		),
	});
}

function TileAction({
	className,
	asChild = false,
	children,
	...props
}: React.ComponentProps<"div"> & {
	asChild?: boolean;
}) {
	return useRender({
		defaultTagName: "div",
		render: asChild ? (children as React.ReactElement) : undefined,
		props: mergeProps<"div">(
			{ className: cn("flex items-center gap-2", className) } as React.ComponentProps<"div">,
			asChild ? props : { ...props, children }
		),
	});
}

export { Tile, TileHeader, TileTitle, TileIcon, TileDescription, TileAction, tileVariants };
