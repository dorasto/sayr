"use client";

import { Button } from "@repo/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { CircleQuestionMark, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip";

interface SplitDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: string;
	children: ReactNode;
	className?: string;
	showTitle?: boolean;
	sidebarPosition?: "left" | "right"; // New prop for sidebar position
}

export function SplitDialog({
	isOpen,
	onOpenChange,
	title,
	description,
	children,
	className,
	showTitle = true,
	sidebarPosition = "left",
}: SplitDialogProps) {
	// Extract SplitDialogContent and SplitDialogSide from children
	let contentComponent: ReactNode = null;
	let sideComponent: ReactNode = null;

	Children.forEach(children, (child) => {
		if (isValidElement(child)) {
			if (child.type === SplitDialogContent) {
				contentComponent = child;
			} else if (child.type === SplitDialogSide) {
				sideComponent = child;
			}
		}
	});

	// const sizeClasses = {
	// 	sm: "max-w-none md:max-w-lg",
	// 	md: "max-w-none md:max-w-xl",
	// 	lg: "max-w-none md:max-w-4xl",
	// 	xl: "max-w-none md:max-w-5xl",
	// };

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				showClose={false}
				className={cn(
					"flex h-[90dvh] max-w-[calc(var(--container-7xl)-3rem)] w-[calc(100vw-3rem)] p-0 gap-0 flex-col",
					"[&>button:last-child]:top-3.5 bg-popover",
					className
				)}
			>
				{description && <DialogDescription className="sr-only">{description}</DialogDescription>}

				{/* Header - Always sticky and above both content areas */}
				<div className="flex-shrink-0 p-4 w-full border-b bg-background">
					<div className="flex items-center gap-3">
						{showTitle && <DialogTitle className="font-semibold text-base!">{title}</DialogTitle>}
						{description && (
							<TooltipProvider delayDuration={0}>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button variant="outline" className="h-2 w-2 p-1">
											<CircleQuestionMark />
										</Button>
									</TooltipTrigger>
									<TooltipContent className="">
										<div className="space-y-1">
											<p className="text-[13px] font-semibold">{title}</p>
											<p className="text-foreground text-xs">{description}</p>
										</div>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
						<DialogClose asChild>
							<Button variant="ghost" className="ml-auto hover:bg-accent p-1 h-2 w-2 aspect-square ">
								<XIcon />
							</Button>
						</DialogClose>
					</div>
				</div>

				{/* Content Area - Sidebar and Main Content side by side */}
				<div
					className={cn(
						"flex-1 overflow-hidden min-h-0 flex",
						sidebarPosition === "left" ? "flex-row" : "flex-row-reverse"
					)}
				>
					{/* Sidebar */}
					{sideComponent}

					{/* Main Content */}
					<div className="flex-1 overflow-y-auto">{contentComponent}</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface SplitDialogContentProps {
	children: ReactNode;
	className?: string;
}

export function SplitDialogContent({ children, className }: SplitDialogContentProps) {
	return <div className={cn("p-4", className)}>{children}</div>;
}

interface SplitDialogSideProps {
	children: ReactNode;
	className?: string;
	width?: string;
}

export function SplitDialogSide({ children, className, width = "w-52" }: SplitDialogSideProps) {
	return (
		<div className={cn("flex-shrink-0 bg-popover overflow-y-auto", width, className)}>
			<div className="p-4">{children}</div>
		</div>
	);
}
