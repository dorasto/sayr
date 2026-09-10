"use client";

import { Menu as MenubarPrimitive } from "@base-ui/react/menu";
import { Menubar as MenubarRootPrimitive } from "@base-ui/react/menubar";
import { cn } from "@repo/ui/lib/utils";
import { Check, ChevronRight, Circle } from "lucide-react";
import type * as React from "react";

function MenubarMenu({ ...props }: MenubarPrimitive.Root.Props) {
	return <MenubarPrimitive.Root {...props} />;
}

function MenubarGroup({ ...props }: MenubarPrimitive.Group.Props) {
	return <MenubarPrimitive.Group {...props} />;
}

function MenubarPortal({ ...props }: MenubarPrimitive.Portal.Props) {
	return <MenubarPrimitive.Portal {...props} />;
}

function MenubarRadioGroup({ ...props }: MenubarPrimitive.RadioGroup.Props) {
	return <MenubarPrimitive.RadioGroup {...props} />;
}

function MenubarSub({ ...props }: MenubarPrimitive.SubmenuRoot.Props) {
	return <MenubarPrimitive.SubmenuRoot data-slot="menubar-sub" {...props} />;
}

function Menubar({ className, ...props }: MenubarRootPrimitive.Props) {
	return (
		<MenubarRootPrimitive
			className={cn("flex h-10 items-center space-x-1 rounded-md border bg-background p-1", className)}
			{...props}
		/>
	);
}

function MenubarTrigger({ className, ...props }: MenubarPrimitive.Trigger.Props) {
	return (
		<MenubarPrimitive.Trigger
			className={cn(
				"flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground",
				className
			)}
			{...props}
		/>
	);
}

function MenubarSubTrigger({
	className,
	inset,
	children,
	...props
}: MenubarPrimitive.SubmenuTrigger.Props & {
	inset?: boolean;
}) {
	return (
		<MenubarPrimitive.SubmenuTrigger
			className={cn(
				"flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground",
				inset && "pl-8",
				className
			)}
			{...props}
		>
			{children}
			<ChevronRight className="ml-auto h-4 w-4" />
		</MenubarPrimitive.SubmenuTrigger>
	);
}

function MenubarSubContent({ className, ...props }: MenubarPrimitive.Popup.Props) {
	return (
		<MenubarPrimitive.Portal>
			<MenubarPrimitive.Positioner
				className="isolate z-50 outline-none"
				align="start"
				alignOffset={-3}
				side="right"
				sideOffset={0}
			>
				<MenubarPrimitive.Popup
					className={cn(
						"z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)",
						className
					)}
					{...props}
				/>
			</MenubarPrimitive.Positioner>
		</MenubarPrimitive.Portal>
	);
}

function MenubarContent({
	className,
	align = "start",
	alignOffset = -4,
	side,
	sideOffset = 8,
	...props
}: MenubarPrimitive.Popup.Props &
	Pick<MenubarPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
	return (
		<MenubarPrimitive.Portal>
			<MenubarPrimitive.Positioner
				className="isolate z-50 outline-none"
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
			>
				<MenubarPrimitive.Popup
					className={cn(
						"z-50 min-w-48 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-open:animate-in data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--transform-origin)",
						className
					)}
					{...props}
				/>
			</MenubarPrimitive.Positioner>
		</MenubarPrimitive.Portal>
	);
}

function MenubarItem({
	className,
	inset,
	...props
}: MenubarPrimitive.Item.Props & {
	inset?: boolean;
}) {
	return (
		<MenubarPrimitive.Item
			className={cn(
				"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				inset && "pl-8",
				className
			)}
			{...props}
		/>
	);
}

function MenubarCheckboxItem({ className, children, checked, ...props }: MenubarPrimitive.CheckboxItem.Props) {
	return (
		<MenubarPrimitive.CheckboxItem
			className={cn(
				"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				className
			)}
			checked={checked}
			{...props}
		>
			<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
				<MenubarPrimitive.CheckboxItemIndicator>
					<Check className="h-4 w-4" />
				</MenubarPrimitive.CheckboxItemIndicator>
			</span>
			{children}
		</MenubarPrimitive.CheckboxItem>
	);
}

function MenubarRadioItem({ className, children, ...props }: MenubarPrimitive.RadioItem.Props) {
	return (
		<MenubarPrimitive.RadioItem
			className={cn(
				"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
				className
			)}
			{...props}
		>
			<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
				<MenubarPrimitive.RadioItemIndicator>
					<Circle className="h-2 w-2 fill-current" />
				</MenubarPrimitive.RadioItemIndicator>
			</span>
			{children}
		</MenubarPrimitive.RadioItem>
	);
}

function MenubarLabel({
	className,
	inset,
	...props
}: MenubarPrimitive.GroupLabel.Props & {
	inset?: boolean;
}) {
	return (
		<MenubarPrimitive.GroupLabel
			className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
			{...props}
		/>
	);
}

function MenubarSeparator({ className, ...props }: MenubarPrimitive.Separator.Props) {
	return <MenubarPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />;
}

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return <span className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)} {...props} />;
};
MenubarShortcut.displayname = "MenubarShortcut";

export {
	Menubar,
	MenubarMenu,
	MenubarTrigger,
	MenubarContent,
	MenubarItem,
	MenubarSeparator,
	MenubarLabel,
	MenubarCheckboxItem,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarPortal,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarGroup,
	MenubarSub,
	MenubarShortcut,
};
