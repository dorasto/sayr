"use client";

import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

interface TabsContextType {
	activeTab: string;
	setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

function useTabsContext() {
	const context = useContext(TabsContext);
	if (!context) {
		throw new Error("Tab components must be used within a TabbedDialog");
	}
	return context;
}

interface Tab {
	id: string;
	label: string;
	icon?: ReactNode;
}

interface TabbedDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	tabs: Tab[];
	defaultTab: string;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg" | "xl";
}

export function TabbedDialog({
	isOpen,
	onOpenChange,
	title,
	description,
	tabs,
	defaultTab,
	children,
	footer,
	className,
	size = "md",
}: TabbedDialogProps) {
	const [activeTab, setActiveTab] = useState(defaultTab);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const checkScrollability = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const { scrollLeft, scrollWidth, clientWidth } = container;
		setCanScrollLeft(scrollLeft > 0);
		setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
	}, []);

	useEffect(() => {
		checkScrollability();
		const container = scrollContainerRef.current;
		if (container) {
			container.addEventListener("scroll", checkScrollability);
			const resizeObserver = new ResizeObserver(checkScrollability);
			resizeObserver.observe(container);

			return () => {
				container.removeEventListener("scroll", checkScrollability);
				resizeObserver.disconnect();
			};
		}
	}, [checkScrollability]);

	const sizeClasses = {
		sm: "sm:max-w-sm",
		md: "sm:max-w-lg",
		lg: "sm:max-w-2xl",
		xl: "sm:max-w-4xl",
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				showClose={false}
				className={cn(
					"flex flex-col max-h-[90vh] p-0 gap-0",
					sizeClasses[size],
					"[&>button:last-child]:top-3.5 bg-popover",
					className
				)}
			>
				<TabsContext.Provider value={{ activeTab, setActiveTab }}>
					{/* Fixed Header with Tabs */}
					<DialogHeader className="flex-shrink-0 border-b px-0 pt-1 space-y-3 relative bg-background">
						<DialogTitle className="sr-only">{title}</DialogTitle>
						<div className="relative">
							{/* Left fade gradient */}
							{canScrollLeft && (
								<div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
							)}

							{/* Right fade gradient */}
							{canScrollRight && (
								<div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
							)}

							<div ref={scrollContainerRef} className="w-full overflow-x-auto scrollbar-hide px-3">
								<div className="flex gap-2 min-w-max pb-1">
									{tabs.map((tab) => (
										<button
											key={tab.id}
											type="button"
											onClick={() => setActiveTab(tab.id)}
											className={cn(
												"flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm transition-all whitespace-nowrap flex-shrink-0",
												"hover:bg-accent hover:text-foreground",
												"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
												"relative",
												activeTab === tab.id
													? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:-mb-1 after:h-0.5 after:bg-primary"
													: "text-muted-foreground"
											)}
										>
											{tab.icon}
											{tab.label}
										</button>
									))}
								</div>
							</div>
						</div>
					</DialogHeader>

					{description && <DialogDescription className="sr-only">{description}</DialogDescription>}

					{/* Scrollable Content */}
					<div className="flex-1 overflow-y-auto min-h-0">{children}</div>

					{/* Fixed Footer */}
					{footer && <DialogFooter className="flex-shrink-0 border-t p-2 bg-background">{footer}</DialogFooter>}
				</TabsContext.Provider>
			</DialogContent>
		</Dialog>
	);
}

interface TabPanelProps {
	tabId: string;
	children: ReactNode;
	className?: string;
}

export function TabPanel({ tabId, children, className }: TabPanelProps) {
	const { activeTab } = useTabsContext();

	if (activeTab !== tabId) {
		return null;
	}

	return <div className={cn("h-full p-3 flex flex-col gap-3", className)}>{children}</div>;
}

// Convenience components for common footer patterns
interface TabbedDialogFooterProps {
	onCancel?: () => void;
	onSubmit?: () => void;
	submitLabel?: string;
	cancelLabel?: string;
	isSubmitting?: boolean;
	submitDisabled?: boolean;
}

export function TabbedDialogFooter({
	onCancel,
	onSubmit,
	submitLabel = "Save changes",
	cancelLabel = "Cancel",
	isSubmitting = false,
	submitDisabled = false,
}: TabbedDialogFooterProps) {
	return (
		<>
			{onCancel && (
				<DialogClose asChild>
					<Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
						{cancelLabel}
					</Button>
				</DialogClose>
			)}
			{onSubmit && (
				<Button type="button" onClick={onSubmit} disabled={isSubmitting || submitDisabled}>
					{isSubmitting ? "Saving..." : submitLabel}
				</Button>
			)}
		</>
	);
}
