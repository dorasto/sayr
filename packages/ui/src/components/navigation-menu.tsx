import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { cn } from "@repo/ui/lib/utils";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";

function NavigationMenu({ className, children, ...props }: NavigationMenuPrimitive.Root.Props) {
	return (
		<NavigationMenuPrimitive.Root
			className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
			{...props}
		>
			{children}
			<NavigationMenuViewport />
		</NavigationMenuPrimitive.Root>
	);
}

function NavigationMenuList({ className, ...props }: NavigationMenuPrimitive.List.Props) {
	return (
		<NavigationMenuPrimitive.List
			className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)}
			{...props}
		/>
	);
}

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
	"group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-popup-open:text-accent-foreground data-popup-open:bg-accent/50 data-popup-open:hover:bg-accent data-popup-open:focus:bg-accent"
);

function NavigationMenuTrigger({ className, children, ...props }: NavigationMenuPrimitive.Trigger.Props) {
	return (
		<NavigationMenuPrimitive.Trigger className={cn(navigationMenuTriggerStyle(), "group", className)} {...props}>
			{children}{" "}
			<ChevronDown
				className="relative top-px ml-1 h-3 w-3 transition duration-200 group-data-popup-open:rotate-180"
				aria-hidden="true"
			/>
		</NavigationMenuPrimitive.Trigger>
	);
}

function NavigationMenuContent({ className, ...props }: NavigationMenuPrimitive.Content.Props) {
	return (
		<NavigationMenuPrimitive.Content
			className={cn(
				"w-full transition-[opacity,transform] data-starting-style:opacity-0 data-ending-style:opacity-0 data-starting-style:data-[activation-direction=right]:slide-in-from-left-52 data-starting-style:data-[activation-direction=left]:slide-in-from-right-52 data-ending-style:data-[activation-direction=right]:slide-out-to-left-52 data-ending-style:data-[activation-direction=left]:slide-out-to-right-52 md:w-auto",
				className
			)}
			{...props}
		/>
	);
}

const NavigationMenuLink = NavigationMenuPrimitive.Link;

function NavigationMenuViewport({ className, ...props }: NavigationMenuPrimitive.Popup.Props) {
	return (
		<NavigationMenuPrimitive.Portal>
			<NavigationMenuPrimitive.Positioner className="isolate z-50" side="bottom" align="center" sideOffset={6}>
				<NavigationMenuPrimitive.Popup
					className={cn(
						"relative mt-1.5 h-(--popup-height) w-full origin-(--transform-origin) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-open:animate-in data-closed:animate-out data-closed:zoom-out-95 data-open:zoom-in-90 md:w-(--popup-width)",
						className
					)}
					{...props}
				>
					<NavigationMenuPrimitive.Viewport className="size-full overflow-hidden" />
				</NavigationMenuPrimitive.Popup>
			</NavigationMenuPrimitive.Positioner>
		</NavigationMenuPrimitive.Portal>
	);
}

function NavigationMenuIndicator({ className, ...props }: NavigationMenuPrimitive.Icon.Props) {
	return (
		<NavigationMenuPrimitive.Icon
			className={cn("top-full z-1 flex h-1.5 items-end justify-center overflow-hidden", className)}
			{...props}
		>
			<div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
		</NavigationMenuPrimitive.Icon>
	);
}

export {
	navigationMenuTriggerStyle,
	NavigationMenu,
	NavigationMenuList,
	NavigationMenuItem,
	NavigationMenuContent,
	NavigationMenuTrigger,
	NavigationMenuLink,
	NavigationMenuIndicator,
	NavigationMenuViewport,
};
