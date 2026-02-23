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
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@repo/ui/components/drawer";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
// @ts-ignore
// it complains about the .tsx for some stupid reason but it works. Doesn't work without it.
import { useIsMobile } from "@repo/ui/hooks/use-mobile.tsx";
import { cn } from "@repo/ui/lib/utils";
import { CircleQuestionMark, XIcon } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip";
import { AnimatedMenuIcon } from "./animated-menu-icon";

interface TabsContextType {
	activeTab: string;
	setActiveTab: (tab: string) => void;
	setTabFooter: (tabId: string, footer: ReactNode) => void;
	layout: "top" | "side";
	stickyHeader: boolean;
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
	group?: string; // For grouping tabs in side layout (legacy support)
	title?: string; // Custom title for this tab (side layout only)
	description?: string; // Custom description for this tab (side layout only)
	footer?: ReactNode; // Per-tab footer content
	href?: string; // Render as a link instead of a tab switcher
	onClick?: () => void; // Fire callback instead of switching tabs
	variant?: "default" | "destructive"; // Visual variant for action items
}

interface TabGroup {
	id: string;
	label: string;
	tabs: Tab[];
}

// New hierarchical group structure
interface TabGroupHierarchical {
	name: string;
	items: Tab[];
}

interface TabbedDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	tabs?: Tab[]; // Made optional when using groupedTabs
	defaultTab: string;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg" | "xl";
	layout?: "top" | "side"; // New prop for layout type
	stickyHeader?: boolean; // Controls whether header is sticky (side layout only)
	groups?: TabGroup[]; // For organizing tabs in groups (side layout only) - legacy
	groupedTabs?: TabGroupHierarchical[]; // New hierarchical structure
	showTitle?: boolean; // Whether to show the title in the header (side layout only)
}

export function TabbedDialog({
	isOpen,
	onOpenChange,
	title,
	description,
	tabs = [],
	defaultTab,
	children,
	footer,
	className,
	size = "lg",
	layout = "top",
	stickyHeader = false, // Default to true for backward compatibility
	groups,
	groupedTabs: groupedTabsProp,
	showTitle = true,
}: TabbedDialogProps) {
	const isMobile = useIsMobile();
	const [activeTab, setActiveTab] = useState(defaultTab);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [tabFooters, setTabFooters] = useState<Map<string, ReactNode>>(new Map());
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Function to set footer for a specific tab
	const setTabFooter = useCallback((tabId: string, footer: ReactNode) => {
		setTabFooters((prev) => {
			const newMap = new Map(prev);
			if (footer) {
				newMap.set(tabId, footer);
			} else {
				newMap.delete(tabId);
			}
			return newMap;
		});
	}, []);

	// Flatten groupedTabs to a tabs array for compatibility (excludes action items)
	const allTabs = useMemo(() => {
		const flatTabs =
			groupedTabsProp && groupedTabsProp.length > 0 ? groupedTabsProp.flatMap((group) => group.items) : tabs;
		return flatTabs.filter((tab) => !tab.href && !tab.onClick);
	}, [groupedTabsProp, tabs]);

	// Get the footer for the current active tab
	const getCurrentFooter = useCallback(() => {
		// First check if the active tab has a footer defined in its tab definition
		const activeTabData = allTabs.find((tab) => tab.id === activeTab);
		if (activeTabData?.footer) {
			return activeTabData.footer;
		}

		// Then check if a TabPanel has set a footer for this tab
		const panelFooter = tabFooters.get(activeTab);
		if (panelFooter) {
			return panelFooter;
		}

		// Finally fall back to the global footer prop (for backward compatibility)
		return footer;
	}, [activeTab, allTabs, tabFooters, footer]);

	// Create grouped tabs structure for side layout
	const processedGroups = useCallback(() => {
		if (layout === "top") {
			return null;
		}

		// If new hierarchical groupedTabs are provided, convert them to TabGroup format
		if (groupedTabsProp && groupedTabsProp.length > 0) {
			return groupedTabsProp.map((group) => ({
				id: group.name.toLowerCase().replace(/\s+/g, "-"),
				label: group.name,
				tabs: group.items,
			}));
		}

		// If explicit groups are provided, use them
		if (groups && groups.length > 0) {
			return groups;
		}

		// Otherwise, create groups based on tab.group property
		const tabGroups: TabGroup[] = [];
		const groupMap = new Map<string, Tab[]>();

		// Group tabs by their group property
		allTabs.forEach((tab) => {
			const groupId = tab.group || "default";
			if (!groupMap.has(groupId)) {
				groupMap.set(groupId, []);
			}
			const group = groupMap.get(groupId);
			if (group) {
				group.push(tab);
			}
		});

		// Convert to TabGroup format
		groupMap.forEach((groupTabs, groupId) => {
			tabGroups.push({
				id: groupId,
				label: groupId === "default" ? "" : groupId,
				tabs: groupTabs,
			});
		});

		return tabGroups;
	}, [layout, groups, groupedTabsProp, allTabs]);

	const tabGroupsData = processedGroups();

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
		sm: layout === "side" ? "max-w-none md:max-w-lg" : "max-w-none md:max-w-lg",
		md: layout === "side" ? "max-w-none md:max-w-xl" : "max-w-none md:max-w-xl",
		lg: layout === "side" ? "max-w-none md:max-w-4xl" : "max-w-none md:max-w-4xl",
		xl: layout === "side" ? "max-w-none md:max-w-5xl" : "max-w-none md:max-w-5xl",
	};

	const renderTopTabs = () => (
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
						{allTabs.map((tab) => (
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
	);

	const renderSideTabItem = (tab: Tab) => {
		const baseClasses = cn(
			"w-full flex items-center gap-2 px-2 py-2.5 text-sm font-medium rounded-lg transition-all text-left overflow-hidden",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		);

		const variantClasses =
			tab.variant === "destructive"
				? "text-destructive hover:bg-destructive/10 hover:text-destructive"
				: "hover:bg-accent hover:text-foreground";

		const content = (
			<>
				<div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{tab.icon}</div>
				<span className="truncate min-w-0 flex-1">{tab.label}</span>
			</>
		);

		// Action item: render as link
		if (tab.href) {
			return (
				<a
					key={tab.id}
					href={tab.href}
					className={cn(baseClasses, variantClasses, "text-muted-foreground")}
				>
					{content}
				</a>
			);
		}

		// Action item: render as button with custom onClick
		if (tab.onClick) {
			return (
				<button
					key={tab.id}
					type="button"
					onClick={tab.onClick}
					className={cn(baseClasses, variantClasses, "text-muted-foreground")}
				>
					{content}
				</button>
			);
		}

		// Regular tab: switch active tab
		return (
			<button
				key={tab.id}
				type="button"
				onClick={() => setActiveTab(tab.id)}
				className={cn(
					baseClasses,
					variantClasses,
					activeTab === tab.id ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground",
				)}
			>
				{content}
			</button>
		);
	};

	const renderSideTabs = () => {
		const groups = tabGroupsData;

		return (
			<div className="flex-shrink-0 w-52 bg-popover overflow-hidden">
				<div className="p-4">
					<h2 className="sr-only">{title}</h2>
					<div className="space-y-4">
						{groups
							? groups.map((group) => (
									<div key={group.id} className="">
										{group.label && (
											<div className="text-xs font-semibold text-muted-foreground mb-2 truncate">
												{group.label}
											</div>
										)}
										<div className="space-y-1">
											{group.tabs.map((tab) => renderSideTabItem(tab))}
										</div>
									</div>
								))
							: allTabs.map((tab) => renderSideTabItem(tab))}
					</div>
				</div>
			</div>
		);
	};

	const renderMobileDropdownItem = (tab: Tab) => {
		const variantClasses = tab.variant === "destructive" ? "text-destructive focus:text-destructive" : "";

		const content = (
			<>
				{tab.icon && <div className="w-4 h-4 flex items-center justify-center">{tab.icon}</div>}
				<span>{tab.label}</span>
			</>
		);

		// Action item: link
		if (tab.href) {
			return (
				<DropdownMenuItem key={tab.id} asChild className={cn("flex items-center gap-2", variantClasses)}>
					<a href={tab.href}>{content}</a>
				</DropdownMenuItem>
			);
		}

		// Action item: custom onClick
		if (tab.onClick) {
			return (
				<DropdownMenuItem
					key={tab.id}
					onClick={tab.onClick}
					className={cn("flex items-center gap-2", variantClasses)}
				>
					{content}
				</DropdownMenuItem>
			);
		}

		// Regular tab
		return (
			<DropdownMenuItem
				key={tab.id}
				onClick={() => setActiveTab(tab.id)}
				className={cn("flex items-center gap-2", activeTab === tab.id && "bg-accent")}
			>
				{content}
			</DropdownMenuItem>
		);
	};

	const renderMobileDrawer = () => {
		const groups = tabGroupsData;
		const activeTabData = allTabs.find((tab) => tab.id === activeTab);

		return (
			<Drawer open={isOpen} onOpenChange={onOpenChange}>
				<DrawerContent className="z-[999] mx-auto max-h-[60%] h-full w-full bg-background p-0 px-4 text-sidebar-foreground [&>button]:hidden">
					<DrawerHeader className="w-full border-0">
						<div className="flex w-full items-center justify-between">
							<div className="flex-1 shrink-0">
								<DrawerTitle className="text-left w-full text-base!">
									{activeTabData?.title || title}
								</DrawerTitle>
								{(activeTabData?.description || description) && (
									<DrawerDescription className="text-left sr-only">
										{activeTabData?.description || description}
									</DrawerDescription>
								)}
							</div>
							{/* Tab Dropdown */}
							<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
								<DropdownMenuTrigger asChild>
									<Button variant="accent" size={"icon"} className="ml-auto">
										<AnimatedMenuIcon isOpen={isDropdownOpen} size={16} />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-56 z-[999]" align="end">
									{groups ? (
										groups.map((group, groupIndex) => (
											<div key={group.id}>
												{group.label && (
													<DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
														{group.label}
													</DropdownMenuLabel>
												)}
												<DropdownMenuGroup>
													{group.tabs.map((tab) => renderMobileDropdownItem(tab))}
												</DropdownMenuGroup>
												{groupIndex < groups.length - 1 && <DropdownMenuSeparator />}
											</div>
										))
									) : (
										<DropdownMenuGroup>
											{allTabs.map((tab) => renderMobileDropdownItem(tab))}
										</DropdownMenuGroup>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</DrawerHeader>

					{/* Scrollable Content */}
					<div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-popover">
						<TabsContext.Provider value={{ activeTab, setActiveTab, setTabFooter, layout, stickyHeader }}>
							{children}
						</TabsContext.Provider>
					</div>

					{/* Footer */}
					{(() => {
						const currentFooter = getCurrentFooter();
						return currentFooter && <DrawerFooter className="border-t flex-row">{currentFooter}</DrawerFooter>;
					})()}
				</DrawerContent>
			</Drawer>
		);
	};

	// Render mobile drawer or desktop dialog
	if (isMobile) {
		return renderMobileDrawer();
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				showClose={false}
				className={cn(
					"flex max-h-[90vh] md:max-h-[70vh] md:h-full p-0 gap-0",
					layout === "side" ? "flex-row" : "flex-col",
					sizeClasses[size],
					"[&>button:last-child]:top-3.5 bg-popover",
					className
				)}
			>
				<TabsContext.Provider value={{ activeTab, setActiveTab, setTabFooter, layout, stickyHeader }}>
					{layout === "top" ? renderTopTabs() : renderSideTabs()}

					{description && <DialogDescription className="sr-only">{description}</DialogDescription>}

					{/* Scrollable Content */}
					<div className="flex-1 overflow-hidden min-h-0 w-full flex flex-col">
						{layout === "side" && stickyHeader && (
							<div className="p-4 w-full">
								{(() => {
									// Find the current active tab to get its custom title/description
									const activeTabData = allTabs.find((tab) => tab.id === activeTab);
									const displayTitle = activeTabData?.title || title;
									const displayDescription = activeTabData?.description || description;

									return (
										<div className="flex items-center gap-3">
											<DialogTitle className="font-semibold text-base!">{displayTitle}</DialogTitle>
											{displayDescription && (
												<TooltipProvider delayDuration={0}>
													<Tooltip>
														<TooltipTrigger asChild>
															<Button variant="outline" className="h-2 w-2 p-1">
																<CircleQuestionMark />
															</Button>
														</TooltipTrigger>
														<TooltipContent className="">
															<div className="space-y-1">
																<p className="text-[13px] font-semibold">{displayTitle}</p>
																<p className="text-foreground text-xs">{displayDescription}</p>
															</div>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
												// <DialogDescription className="text-sm text-muted-foreground mt-1">
												// 	{displayDescription}
												// </DialogDescription>
											)}
											<DialogClose asChild>
												<Button
													variant="ghost"
													className="ml-auto hover:bg-accent p-1 h-2 w-2 aspect-square "
												>
													<XIcon />
												</Button>
											</DialogClose>
										</div>
									);
								})()}
							</div>
						)}
						<div
							className={cn("flex-1 min-h-0", "overflow-y-auto", layout === "side" && !stickyHeader && "px-6")}
						>
							{layout === "side" && !stickyHeader && (
								<div className={cn("w-full", showTitle ? "p-4" : "")}>
									{(() => {
										// Find the current active tab to get its custom title/description
										const activeTabData = allTabs.find((tab) => tab.id === activeTab);
										const displayTitle = activeTabData?.title || title;
										const displayDescription = activeTabData?.description || description;

										return (
											<div className="flex items-center gap-3 relative">
												{showTitle && (
													<DialogTitle className="font-semibold text-base!">{displayTitle}</DialogTitle>
												)}
												{displayDescription && (
													<TooltipProvider delayDuration={0}>
														<Tooltip>
															<TooltipTrigger asChild>
																<Button variant="outline" className="h-2 w-2 p-1">
																	<CircleQuestionMark />
																</Button>
															</TooltipTrigger>
															<TooltipContent className="">
																<div className="space-y-1">
																	<p className="text-[13px] font-semibold">{displayTitle}</p>
																	<p className="text-foreground text-xs">{displayDescription}</p>
																</div>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
													// <DialogDescription className="text-sm text-muted-foreground mt-1">
													// 	{displayDescription}
													// </DialogDescription>
												)}
												<DialogClose asChild>
													<Button
														variant="ghost"
														className="fixed top-4 right-4 hover:bg-accent p-1 h-2 w-2 aspect-square "
													>
														<XIcon />
													</Button>
												</DialogClose>
											</div>
										);
									})()}
								</div>
							)}
							{children}
						</div>
						{/* Fixed Footer */}
						{(() => {
							const currentFooter = getCurrentFooter();
							return (
								currentFooter && (
									<DialogFooter className="flex-shrink-0 border-t border-l rounded-tl-md p-2 bg-background flex-row w-full">
										{currentFooter}
									</DialogFooter>
								)
							);
						})()}
					</div>
				</TabsContext.Provider>
			</DialogContent>
		</Dialog>
	);
}

interface TabPanelProps {
	tabId: string;
	children: ReactNode;
	className?: string;
	footer?: ReactNode; // Per-panel footer content
}

export function TabPanel({ tabId, children, className, footer }: TabPanelProps) {
	const { activeTab, setTabFooter, layout, stickyHeader } = useTabsContext();

	// Register footer when component mounts/updates and unregister when unmounts
	useEffect(() => {
		if (footer) {
			setTabFooter(tabId, footer);
		}
		return () => {
			setTabFooter(tabId, null);
		};
	}, [tabId, footer, setTabFooter]);

	if (activeTab !== tabId) {
		return null;
	}

	// When layout is "side" and stickyHeader is false, don't add overflow-y-auto
	// as the parent container handles all scrolling
	const shouldAddScrolling = !(layout === "side" && !stickyHeader);

	return <div className={cn("p-4", shouldAddScrolling && "overflow-y-auto", className)}>{children}</div>;
}

// Convenience components for common footer patterns
interface TabbedDialogFooterProps {
	onCancel?: () => void;
	onSubmit?: () => void;
	submitLabel?: string;
	cancelLabel?: string;
	isSubmitting?: boolean;
	submitDisabled?: boolean;
	classNameCancel?: string;
	classNameSuccess?: string;
	cancelVariant?:
		| "link"
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "accent"
		| "success"
		| "ghost"
		| null
		| undefined;
	successVariant?:
		| "link"
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "accent"
		| "success"
		| "ghost"
		| null
		| undefined;
}

export function TabbedDialogFooter({
	onCancel,
	onSubmit,
	submitLabel = "Save changes",
	cancelLabel = "Cancel",
	isSubmitting = false,
	submitDisabled = false,
	classNameCancel,
	classNameSuccess,
	cancelVariant = "outline",
	successVariant = "success",
}: TabbedDialogFooterProps) {
	return (
		<div className="ml-auto gap-2 flex flex-row">
			{onCancel && (
				<DialogClose asChild>
					<Button
						type="button"
						variant={cancelVariant}
						disabled={isSubmitting}
						onClick={onCancel}
						className={cn(classNameCancel)}
					>
						{cancelLabel}
					</Button>
				</DialogClose>
			)}
			{onSubmit && (
				<Button
					variant={successVariant}
					type="button"
					onClick={onSubmit}
					disabled={isSubmitting || submitDisabled}
					className={cn(classNameSuccess)}
				>
					{isSubmitting ? "Saving..." : submitLabel}
				</Button>
			)}
		</div>
	);
}

export { TabbedDialogExample } from "./tabbed-dialog-example";
