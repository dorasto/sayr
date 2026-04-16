"use client";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@repo/ui/components/command";
import { DialogTitle } from "@repo/ui/components/dialog";
import {
	IconArrowBack,
	IconArrowLeft,
	IconArrowsUpDown,
	IconLoader2,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-store";
import * as React from "react";
import { useCommandRegistry } from "@/hooks/use-command-registry";
import { useCommandSearch } from "@/hooks/useCommandSearch";
import { commandActions, commandStore } from "@/lib/command-store";
import { searchOrgTasks, type OrgTaskSearchResult } from "@/lib/fetches/searchTasks";
import {
	assignToggleMeta,
	taskStatusIcon,
} from "@/lib/command-item-helpers";
import type {
	CommandGroup as CommandGroupType,
	CommandItem as CommandItemType,
} from "@/types/command";

// ---------------------------------------------------------------------------
// Shared render helper — single source of truth for how a CommandItem looks.
// All three previous duplicate render blocks now call this.
// ---------------------------------------------------------------------------
function renderCommandItem(
	item: CommandItemType,
	onSelect: (item: CommandItemType) => void,
	opts: { showShortcut?: boolean } = {},
) {
	return (
		<CommandItem
			key={item.id}
			onSelect={() => onSelect(item)}
			value={item.id}
			keywords={[item.label, ...(item.keywords ? [item.keywords] : [])]}
		>
			{item.icon}
			<span className="truncate">{item.label}</span>
			{item.metadata && (
				<span className="ml-auto text-xs text-muted-foreground shrink-0">
					{item.metadata}
				</span>
			)}
			{opts.showShortcut && item.shortcut && (
				<CommandShortcut className="justify-center">{item.shortcut}</CommandShortcut>
			)}
		</CommandItem>
	);
}

export default function AdminCommand() {
	const open = useStore(commandStore, (state) => state.open);
	const initialView = useStore(commandStore, (state) => state.initialView);
	const taskAssignmentContext = useStore(commandStore, (state) => state.taskAssignmentContext);
	const [viewStack, setViewStack] = React.useState<string[]>(["root"]);
	const [search, setSearch] = React.useState("");
	const commands = useCommandRegistry();
	const { results: searchResults, isSearching } = useCommandSearch(search, open);

	const activeView = viewStack[viewStack.length - 1] || "root";
	const activeGroups = commands[activeView] || [];

	// Assignment mode: active when the current sub-view matches the context's viewId
	const isAssignmentMode = !!taskAssignmentContext && activeView === taskAssignmentContext.viewId;

	// Assignment search state
	const [assignmentResults, setAssignmentResults] = React.useState<OrgTaskSearchResult[]>([]);
	const [isAssignmentSearching, setIsAssignmentSearching] = React.useState(false);

	// Debounced org-task search when in assignment mode
	React.useEffect(() => {
		if (!isAssignmentMode || !taskAssignmentContext) {
			setAssignmentResults([]);
			return;
		}

		setIsAssignmentSearching(true);
		const controller = new AbortController();
		const timer = setTimeout(() => {
			searchOrgTasks(taskAssignmentContext.orgId, search, 20, 0, controller.signal)
				.then((results) => {
					setAssignmentResults(results);
					setIsAssignmentSearching(false);
				})
				.catch(() => {
					setIsAssignmentSearching(false);
				});
		}, 200);

		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	}, [isAssignmentMode, taskAssignmentContext, search]);

	// Reset assignment results when leaving assignment mode
	React.useEffect(() => {
		if (!isAssignmentMode) setAssignmentResults([]);
	}, [isAssignmentMode]);

	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				commandActions.toggle();
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	// Track initial view in a ref so the open effect doesn't depend on it
	const initialViewRef = React.useRef(initialView);
	initialViewRef.current = initialView;
	const commandsRef = React.useRef(commands);
	commandsRef.current = commands;

	// When opening, auto-drill into the initial view if one is set; reset on close
	React.useEffect(() => {
		if (open) {
			const iv = initialViewRef.current;
			if (iv && commandsRef.current[iv.viewId]) {
				setViewStack(["root", iv.viewId]);
			} else {
				setViewStack(["root"]);
			}
		} else {
			setTimeout(() => {
				setViewStack(["root"]);
				setSearch("");
			}, 200);
		}
	}, [open]);

	// Badge shown inside the input when drilled into an initialView sub-view
	const viewBadge = React.useMemo(() => {
		if (viewStack.length <= 1) return null;
		if (initialView && activeView === initialView.viewId) return initialView.label;
		return null;
	}, [viewStack.length, activeView, initialView]);

	const handleSelect = (item: CommandItemType) => {
		if (item.subId) {
			setViewStack((prev) => [...prev, item.subId as string]);
			setSearch("");
		} else if (item.action) {
			item.action();
			if (item.closeOnSelect !== false) commandActions.close();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Backspace" && !search && viewStack.length > 1) {
			e.preventDefault();
			setViewStack((prev) => prev.slice(0, -1));
		}
		if (e.key === "ArrowLeft" && !search && viewStack.length > 1) {
			e.preventDefault();
			setViewStack((prev) => prev.slice(0, -1));
		}
	};

	// Assignment mode: build CommandItemType list from live search results.
	// Uses shared helpers so icon colour and metadata layout are defined once.
	const assignmentItems: CommandItemType[] = React.useMemo(() => {
		if (!isAssignmentMode || !taskAssignmentContext) return [];
		const assignedSet = new Set(taskAssignmentContext.assignedTaskIds);
		return assignmentResults.map((task) => {
			const isAssigned = assignedSet.has(task.id);
			return {
				id: `assignment-search-${task.id}`,
				label: task.title || "Untitled task",
				icon: taskStatusIcon(task.status, isAssigned),
				metadata: assignToggleMeta(task.shortId, isAssigned),
				keywords: `${task.shortId ?? ""} ${task.title ?? ""}`,
				closeOnSelect: false,
				action: async () => {
					if (isAssigned) {
						await taskAssignmentContext.onRemove(task.id);
					} else {
						await taskAssignmentContext.onAssign(task);
					}
				},
			};
		});
	}, [isAssignmentMode, taskAssignmentContext, assignmentResults]);

	const hasSearchResults = searchResults.length > 0;

	return (
		<>
			<CommandDialog open={open} onOpenChange={commandActions.setOpen} showOverlay={false}>
				<DialogTitle className="sr-only">Search input</DialogTitle>
				<CommandInput
					placeholder={isAssignmentMode ? "Search tasks to add..." : "Type a command or search..."}
					value={search}
					onValueChange={setSearch}
					onKeyDown={handleKeyDown}
					icon={
						viewStack.length > 1 ? (
							<IconArrowLeft
								className="mr-2 h-4 w-4 shrink-0 opacity-50 cursor-pointer hover:opacity-100"
								onClick={() => setViewStack((prev) => prev.slice(0, -1))}
							/>
						) : undefined
					}
					badge={
						viewBadge ? (
							<span className="mr-2 shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
								{viewBadge}
							</span>
						) : undefined
					}
				/>
				<CommandList>
					<CommandEmpty>
						{isAssignmentMode ? (
							isAssignmentSearching ? (
								<div className="flex items-center justify-center gap-2 text-muted-foreground">
									<IconLoader2 className="h-4 w-4 animate-spin" />
									<span>Searching...</span>
								</div>
							) : (
								"No tasks found."
							)
						) : isSearching ? (
							<div className="flex items-center justify-center gap-2 text-muted-foreground">
								<IconLoader2 className="h-4 w-4 animate-spin" />
								<span>Searching...</span>
							</div>
						) : (
							"No results found."
						)}
					</CommandEmpty>

					{isAssignmentMode ? (
						<>
							{isAssignmentSearching && assignmentItems.length === 0 && (
								<div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
									<IconLoader2 className="h-4 w-4 animate-spin" />
									<span>Searching tasks...</span>
								</div>
							)}

							{/* Live search results */}
							{assignmentItems.length > 0 && (
								<CommandGroup heading="Tasks">
									{assignmentItems.map((item) => renderCommandItem(item, handleSelect))}
								</CommandGroup>
							)}

							{/* Static sub-view groups (tasks already in release) — only when not searching */}
							{!search && activeGroups.length > 0 && (
								<>
									{assignmentItems.length > 0 && <CommandSeparator />}
									{activeGroups.map((group: CommandGroupType, groupIndex: number) => (
										<React.Fragment key={`${group.heading}-${groupIndex}`}>
											<CommandGroup heading={group.heading}>
												{group.items.map((item) => renderCommandItem(item, handleSelect))}
											</CommandGroup>
											{groupIndex < activeGroups.length - 1 && <CommandSeparator />}
										</React.Fragment>
									))}
								</>
							)}
						</>
					) : (
						<>
							{/* Server-side cross-org task search results */}
							{hasSearchResults && (
								<>
									<CommandGroup heading="Tasks">
										{searchResults.map((item) => renderCommandItem(item, handleSelect))}
									</CommandGroup>
									{activeGroups.length > 0 && <CommandSeparator />}
								</>
							)}

							{isSearching && !hasSearchResults && search.length >= 2 && (
								<div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
									<IconLoader2 className="h-4 w-4 animate-spin" />
									<span>Searching tasks...</span>
								</div>
							)}

							{/* Registered command groups — shortcuts shown here only */}
							{activeGroups.map((group: CommandGroupType, groupIndex: number) => (
								<React.Fragment key={`${group.heading}-${groupIndex}`}>
									<CommandGroup heading={group.heading}>
										{group.items.map((item) =>
											renderCommandItem(item, handleSelect, { showShortcut: true }),
										)}
									</CommandGroup>
									{groupIndex < activeGroups.length - 1 && <CommandSeparator />}
								</React.Fragment>
							))}
						</>
					)}
				</CommandList>

				<div className="flex items-center justify-between border-t bg-accent/50 px-3 py-2">
					<div className="flex items-center gap-3 text-xs text-muted-foreground">
						<div className="flex items-center gap-1">
							<IconArrowsUpDown className="h-3 w-3" />
							<span>Navigate</span>
						</div>
						<div className="flex items-center gap-1">
							<IconArrowBack className="h-3 w-3" />
							<span>Select</span>
						</div>
						{viewStack.length > 1 && (
							<div className="flex items-center gap-1">
								<IconArrowLeft className="h-3 w-3" />
								<span>Back</span>
							</div>
						)}
					</div>
				</div>
			</CommandDialog>
		</>
	);
}
