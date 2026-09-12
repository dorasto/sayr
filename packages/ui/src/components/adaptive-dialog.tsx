"use client";

// @ts-ignore
// it complains about the .tsx for some stupid reason but it works. Doesn't work without it.
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { X } from "lucide-react";
import * as React from "react";
import {
	DialogClose as BaseDialogClose,
	DialogContent as BaseDialogContent,
	DialogDescription as BaseDialogDescription,
	DialogFooter as BaseDialogFooter,
	DialogHeader as BaseDialogHeader,
	DialogTitle as BaseDialogTitle,
	Dialog,
	DialogTrigger,
} from "./dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "./drawer";

// Every Adaptive* subcomponent needs to agree on Dialog vs Drawer with the
// Root, in the SAME render — each calling useIsMobile() independently can
// desync across a remount (e.g. after an error-boundary recovery), producing
// a DialogContent mounted inside a Drawer.Root (or vice versa) and throwing
// "DialogRootContext is missing". Read from this context instead of the hook
// directly so the whole subtree is always consistent with the Root's choice.
const AdaptiveDialogContext = React.createContext<boolean>(false);

// Core adaptive dialog that chooses between Dialog and Drawer.
// `Dialog`'s (Base UI) children accept a payload-render-function form we
// never use here — narrowed to plain ReactNode so it satisfies both branches
// (Drawer, from vaul, only ever accepts plain ReactNode children). Same for
// `onOpenChange`: Base UI's callback also receives an `eventDetails` second
// argument that vaul's Drawer doesn't pass through; every real call site here
// only ever declares a 1-arg handler, so the wrapper's type reflects that.
// `modal` gets the same treatment: Base UI adds a `"trap-focus"` value Drawer
// doesn't support, and nothing here actually uses it.
const AdaptiveDialog = ({
	children,
	onOpenChange,
	modal,
	...props
}: Omit<React.ComponentProps<typeof Dialog>, "children" | "onOpenChange" | "modal"> & {
	children?: React.ReactNode;
	onOpenChange?: (open: boolean) => void;
	modal?: boolean;
}) => {
	const isMobile = useIsMobile();

	return (
		<AdaptiveDialogContext.Provider value={isMobile}>
			{isMobile ? (
				<Drawer onOpenChange={onOpenChange} modal={modal} {...props}>
					{children}
				</Drawer>
			) : (
				<Dialog onOpenChange={onOpenChange} modal={modal} {...props}>
					{children}
				</Dialog>
			)}
		</AdaptiveDialogContext.Provider>
	);
};

// Drawer's trigger (vaul, Radix-based) and Dialog's trigger (Base UI) don't
// share a prop shape: `handle`/`payload` only exist on the Base UI side, and
// neither real usage in this app passes them to AdaptiveDialogTrigger — so
// they're kept out of the props forwarded to Drawer rather than typed away.
// `className`/`style` have the same render-callback-form mismatch as
// AdaptiveDialogClose below (no real usage passes a function to either here).
const AdaptiveDialogTrigger = ({
	children,
	handle,
	payload,
	className,
	style,
	...props
}: Omit<React.ComponentProps<typeof DialogTrigger>, "className" | "style"> & {
	className?: string;
	style?: React.CSSProperties;
}) => {
	const isMobile = React.useContext(AdaptiveDialogContext);

	if (isMobile) {
		return (
			<DrawerTrigger className={className} style={style} {...props}>
				{children}
			</DrawerTrigger>
		);
	}

	return (
		<DialogTrigger handle={handle} payload={payload} className={className} style={style} {...props}>
			{children}
		</DialogTrigger>
	);
};

// Same story as the trigger: Base UI's Close supports a render-callback form
// for `className`/`style` (receiving close state) that Drawer's Radix-based
// Close doesn't understand. No real usage passes a function here, so the
// wrapper's own prop type is narrowed to the plain form both branches accept.
const AdaptiveDialogClose = ({
	children,
	className,
	style,
	...props
}: Omit<React.ComponentProps<typeof BaseDialogClose>, "className" | "style"> & {
	className?: string;
	style?: React.CSSProperties;
}) => {
	const isMobile = React.useContext(AdaptiveDialogContext);

	if (isMobile) {
		return (
			<DrawerClose className={className} style={style} {...props}>
				{children}
			</DrawerClose>
		);
	}

	return (
		<BaseDialogClose className={className} style={style} {...props}>
			{children}
		</BaseDialogClose>
	);
};

interface AdaptiveDialogContentProps extends React.ComponentPropsWithoutRef<typeof BaseDialogContent> {
	showClose?: boolean;
	drawerProps?: Partial<React.ComponentPropsWithoutRef<typeof DrawerContent>>;
	size?: "small" | "medium" | "large";
	dialogClassName?: string;
	childClassName?: string;
}

const AdaptiveDialogContent = React.forwardRef<React.ElementRef<typeof BaseDialogContent>, AdaptiveDialogContentProps>(
	(
		{
			className,
			children,
			showClose = true,
			drawerProps = {},
			size = "medium",
			dialogClassName,
			childClassName,
			...props
		},
		ref
	) => {
		const isMobile = React.useContext(AdaptiveDialogContext);

		if (isMobile) {
			const { className: drawerClassName, ...restDrawerProps } = drawerProps;
			return (
				<DrawerContent className={cn("max-h-[85vh] flex flex-col", drawerClassName)} {...restDrawerProps}>
					<div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
					{showClose && (
						<DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
							<X className="h-4 w-4" />
							<span className="sr-only">Close</span>
						</DrawerClose>
					)}
				</DrawerContent>
			);
		}

		return (
			<BaseDialogContent
				ref={ref}
				className={cn(
					"max-h-[85vh] flex flex-col p-0 overflow-hidden",
					size === "small" && "max-w-none md:max-w-lg",
					size === "medium" && "max-w-none md:max-w-2xl",
					size === "large" && "max-w-none md:max-w-4xl",
					dialogClassName,
					className
				)}
				showClose={showClose}
				{...props}
			>
				<div className={cn("flex-1 overflow-y-auto overflow-x-hidden", childClassName)}>{children}</div>
			</BaseDialogContent>
		);
	}
);
AdaptiveDialogContent.displayName = "AdaptiveDialogContent";

const AdaptiveDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
	const isMobile = React.useContext(AdaptiveDialogContext);

	if (isMobile) {
		return <DrawerHeader className={className} {...props} />;
	}

	return <BaseDialogHeader className={cn(className, "p-3")} {...props} />;
};
AdaptiveDialogHeader.displayName = "AdaptiveDialogHeader";

const AdaptiveDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
	const isMobile = React.useContext(AdaptiveDialogContext);

	if (isMobile) {
		return <DrawerFooter className={className} {...props} />;
	}

	return <BaseDialogFooter className={cn(className, "bg-background p-3 border-t")} {...props} />;
};
AdaptiveDialogFooter.displayName = "AdaptiveDialogFooter";

// Base UI's Title/Description also support the render-callback
// `className`/`style` form (same pattern as AdaptiveDialogClose/Trigger
// above) — narrowed here too, since Drawer's Radix-based Title/Description
// don't understand it and no real usage passes a function.
const AdaptiveDialogTitle = React.forwardRef<
	React.ElementRef<typeof BaseDialogTitle>,
	Omit<React.ComponentPropsWithoutRef<typeof BaseDialogTitle>, "className" | "style"> & {
		className?: string;
		style?: React.CSSProperties;
	}
>(({ className, style, ...props }, ref) => {
	const isMobile = React.useContext(AdaptiveDialogContext);

	if (isMobile) {
		return <DrawerTitle ref={ref} className={className} style={style} {...props} />;
	}

	return <BaseDialogTitle ref={ref} className={className} style={style} {...props} />;
});
AdaptiveDialogTitle.displayName = "AdaptiveDialogTitle";

const AdaptiveDialogDescription = React.forwardRef<
	React.ElementRef<typeof BaseDialogDescription>,
	Omit<React.ComponentPropsWithoutRef<typeof BaseDialogDescription>, "className" | "style"> & {
		className?: string;
		style?: React.CSSProperties;
	}
>(({ className, style, ...props }, ref) => {
	const isMobile = React.useContext(AdaptiveDialogContext);

	if (isMobile) {
		return <DrawerDescription ref={ref} className={className} style={style} {...props} />;
	}

	return <BaseDialogDescription ref={ref} className={className} style={style} {...props} />;
});
AdaptiveDialogDescription.displayName = "AdaptiveDialogDescription";

const AdaptiveDialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4", className)} {...props} />
);
AdaptiveDialogBody.displayName = "AdaptiveDialogBody";

export {
	AdaptiveDialog,
	AdaptiveDialogTrigger,
	AdaptiveDialogContent,
	AdaptiveDialogHeader,
	AdaptiveDialogFooter,
	AdaptiveDialogTitle,
	AdaptiveDialogDescription,
	AdaptiveDialogClose,
	AdaptiveDialogBody,
};
