"use client";

import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { cn } from "@repo/ui/lib/utils";
import { s } from "framer-motion/client";
import { Check, ChevronRight, Circle } from "lucide-react";
import type * as React from "react";

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.SubmenuRoot;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

function ContextMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: ContextMenuPrimitive.SubmenuTrigger.Props & {
	inset?: boolean;
}) {
	return (
		<ContextMenuPrimitive.SubmenuTrigger
			className={cn(
				"flex cursor-default select-none items-center rounded-xl! px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground",
				inset && "pl-8",
				className
			)}
			{...props}
		>
			{children}
			<ChevronRight className="ml-auto h-4 w-4" />
		</ContextMenuPrimitive.SubmenuTrigger>
	);
}

function ContextMenuSubContent({ className, ...props }: ContextMenuPrimitive.Popup.Props) {
	return (
		<ContextMenuPrimitive.Portal>
			<ContextMenuPrimitive.Positioner
				className="isolate z-50 outline-none"
				align="start"
				alignOffset={4}
				side="right"
				sideOffset={0}
			>
				<ContextMenuPrimitive.Popup
					className={cn(
						"z-50 min-w-32 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-md data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)",
						className
					)}
					{...props}
				/>
			</ContextMenuPrimitive.Positioner>
		</ContextMenuPrimitive.Portal>
	);
}

function ContextMenuContent({
	className,
	alignOffset,
	...props
}: ContextMenuPrimitive.Popup.Props & Pick<ContextMenuPrimitive.Positioner.Props, "alignOffset">) {
	return (
		<ContextMenuPrimitive.Portal>
			<ContextMenuPrimitive.Positioner className="isolate z-50 outline-none" alignOffset={alignOffset}>
				<ContextMenuPrimitive.Popup
					className={cn(
						"z-50 max-h-(--available-height) min-w-32 overflow-y-auto overflow-x-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)",
						className
					)}
					{...props}
				/>
			</ContextMenuPrimitive.Positioner>
		</ContextMenuPrimitive.Portal>
	);
}

function ContextMenuItem({
	className,
	inset,
	...props
}: ContextMenuPrimitive.Item.Props & {
	inset?: boolean;
}) {
	return (
		<ContextMenuPrimitive.Item
			className={cn(
				"relative flex cursor-default select-none items-center rounded-xl px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				inset && "pl-8",
				className
			)}
			{...props}
		/>
	);
}

function ContextMenuCheckboxItem({
	className,
	children,
	checked,
	side = "left",
	...props
}: ContextMenuPrimitive.CheckboxItem.Props & {
	side?: "left" | "right";
}) {
	return (
		<ContextMenuPrimitive.CheckboxItem
			className={cn(
				"relative flex cursor-default select-none items-center rounded-xl py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				side === "left" ? "pl-8 pr-2" : "pl-2 pr-8",
				className
			)}
			checked={checked}
			{...props}
		>
			<span
				className={cn(
					"absolute flex h-3.5 w-3.5 items-center justify-center",
					side === "left" ? "left-2" : "right-2"
				)}
			>
				<ContextMenuPrimitive.CheckboxItemIndicator>
					<Check className="h-4 w-4" />
				</ContextMenuPrimitive.CheckboxItemIndicator>
			</span>
			{children}
		</ContextMenuPrimitive.CheckboxItem>
	);
}

function ContextMenuRadioItem({
	className,
	children,
	showDot = true,
	...props
}: ContextMenuPrimitive.RadioItem.Props & {
	showDot?: boolean;
}) {
	return (
		<ContextMenuPrimitive.RadioItem
			className={cn(
				"relative flex cursor-default select-none items-center rounded-xl py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				showDot && "pl-8",
				"data-checked:bg-accent",
				className
			)}
			{...props}
		>
			{showDot && (
				<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
					<ContextMenuPrimitive.RadioItemIndicator>
						<Circle className="h-2 w-2 fill-current" />
					</ContextMenuPrimitive.RadioItemIndicator>
				</span>
			)}
			{children}
		</ContextMenuPrimitive.RadioItem>
	);
}

function ContextMenuLabel({
	className,
	inset,
	...props
}: ContextMenuPrimitive.GroupLabel.Props & {
	inset?: boolean;
}) {
	return (
		<ContextMenuPrimitive.GroupLabel
			className={cn("px-2 py-1.5 text-sm font-semibold text-foreground", inset && "pl-8", className)}
			{...props}
		/>
	);
}

function ContextMenuSeparator({ className, ...props }: ContextMenuPrimitive.Separator.Props) {
	return <ContextMenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuCheckboxItem,
	ContextMenuRadioItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuGroup,
	ContextMenuPortal,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuRadioGroup,
};
