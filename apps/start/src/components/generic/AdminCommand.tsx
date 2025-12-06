"use client";
import { Button } from "@repo/ui/components/button";
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
import { Kbd } from "@repo/ui/components/kbd";
import { IconArrowBack, IconArrowLeft, IconArrowsUpDown, IconSearch } from "@tabler/icons-react";
import * as React from "react";
import { useCommandRegistry } from "@/hooks/use-command-registry";
import type { CommandGroup as CommandGroupType, CommandItem as CommandItemType } from "@/types/command";

export default function AdminCommand() {
	const [open, setOpen] = React.useState(false);
	const [viewStack, setViewStack] = React.useState<string[]>(["root"]);
	const [search, setSearch] = React.useState("");
	const commands = useCommandRegistry();

	const activeView = viewStack[viewStack.length - 1] || "root";
	const activeGroups = commands[activeView] || [];

	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	// Reset stack when closing
	React.useEffect(() => {
		if (!open) {
			setTimeout(() => {
				setViewStack(["root"]);
				setSearch("");
			}, 200);
		}
	}, [open]);

	const handleSelect = (item: CommandItemType) => {
		if (item.subId) {
			setViewStack((prev) => [...prev, item.subId as string]);
			setSearch("");
		} else if (item.action) {
			item.action();
			if (item.closeOnSelect !== false) {
				setOpen(false);
			}
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

	return (
		<>
			<Button type="button" onClick={() => setOpen(true)} variant={"primary"} className="" size={"sm"}>
				<span className="flex grow items-center">
					<IconSearch className="text-muted-foreground -ms-1 me-3" size={16} aria-hidden="true" />
					<span className="text-muted-foreground">Search...</span>
				</span>
				<Kbd className="ms-12 -me-1 inline-flex h-5 bg-accent text-muted-foreground">⌘K</Kbd>
			</Button>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<DialogTitle className="sr-only">Search input</DialogTitle>
				<CommandInput
					placeholder="Type a command or search..."
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
				/>
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					{activeGroups.map((group: CommandGroupType, groupIndex: number) => (
						<React.Fragment key={group.heading}>
							<CommandGroup heading={group.heading}>
								{group.items.map((item: CommandItemType) => (
									<CommandItem key={item.id} onSelect={() => handleSelect(item)} value={item.label}>
										{item.icon}
										<span>{item.label}</span>
										{item.shortcut && (
											<CommandShortcut className="justify-center">{item.shortcut}</CommandShortcut>
										)}
									</CommandItem>
								))}
							</CommandGroup>
							{groupIndex < activeGroups.length - 1 && <CommandSeparator />}
						</React.Fragment>
					))}
					{viewStack.length > 1 && (
						<>
							{activeGroups.length > 0 && <CommandSeparator />}
							<CommandGroup heading="Navigation">
								<CommandItem
									value="Go back"
									onSelect={() => {
										setViewStack((prev) => prev.slice(0, -1));
										setSearch("");
									}}
								>
									<IconArrowLeft className="opacity-60" />
									<span>Go back</span>
								</CommandItem>
							</CommandGroup>
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
