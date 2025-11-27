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
} from "./drawer";

// Core adaptive dialog that chooses between Dialog and Drawer
const AdaptiveDialog = ({ children, ...props }: React.ComponentProps<typeof Dialog>) => {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <Drawer {...props}>{children}</Drawer>;
	}

	return <Dialog {...props}>{children}</Dialog>;
};

const AdaptiveDialogTrigger = DialogTrigger;

const AdaptiveDialogClose = ({ children, ...props }: React.ComponentProps<typeof BaseDialogClose>) => {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <DrawerClose {...props}>{children}</DrawerClose>;
	}

	return <BaseDialogClose {...props}>{children}</BaseDialogClose>;
};

interface AdaptiveDialogContentProps extends React.ComponentPropsWithoutRef<typeof BaseDialogContent> {
	showClose?: boolean;
	drawerProps?: Partial<React.ComponentPropsWithoutRef<typeof DrawerContent>>;
	size?: "small" | "medium" | "large";
	dialogClassName?: string;
}

const AdaptiveDialogContent = React.forwardRef<React.ElementRef<typeof BaseDialogContent>, AdaptiveDialogContentProps>(
	({ className, children, showClose = true, drawerProps = {}, size = "medium", dialogClassName, ...props }, ref) => {
		const isMobile = useIsMobile();

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
				<div className="flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
			</BaseDialogContent>
		);
	}
);
AdaptiveDialogContent.displayName = "AdaptiveDialogContent";

const AdaptiveDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <DrawerHeader className={className} {...props} />;
	}

	return <BaseDialogHeader className={cn(className, "p-3")} {...props} />;
};
AdaptiveDialogHeader.displayName = "AdaptiveDialogHeader";

const AdaptiveDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <DrawerFooter className={className} {...props} />;
	}

	return <BaseDialogFooter className={cn(className, "bg-background p-3 border-t")} {...props} />;
};
AdaptiveDialogFooter.displayName = "AdaptiveDialogFooter";

const AdaptiveDialogTitle = React.forwardRef<
	React.ElementRef<typeof BaseDialogTitle>,
	React.ComponentPropsWithoutRef<typeof BaseDialogTitle>
>(({ className, ...props }, ref) => {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <DrawerTitle ref={ref} className={className} {...props} />;
	}

	return <BaseDialogTitle ref={ref} className={className} {...props} />;
});
AdaptiveDialogTitle.displayName = "AdaptiveDialogTitle";

const AdaptiveDialogDescription = React.forwardRef<
	React.ElementRef<typeof BaseDialogDescription>,
	React.ComponentPropsWithoutRef<typeof BaseDialogDescription>
>(({ className, ...props }, ref) => {
	const isMobile = useIsMobile();

	if (isMobile) {
		return <DrawerDescription ref={ref} className={className} {...props} />;
	}

	return <BaseDialogDescription ref={ref} className={className} {...props} />;
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
