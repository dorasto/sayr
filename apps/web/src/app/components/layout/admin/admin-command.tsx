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
import { IconSearch } from "@tabler/icons-react";
import { ArrowUpRightIcon, CircleFadingPlusIcon, FileInputIcon, FolderPlusIcon } from "lucide-react";
import * as React from "react";

export default function AdminCommand() {
	const [open, setOpen] = React.useState(false);

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

	return (
		<>
			<Button
				type="button"
				onClick={() => setOpen(true)}
				variant={"outline"}
				className="bg-muted rounded-md"
				size={"sm"}
			>
				<span className="flex grow items-center">
					<IconSearch className="text-muted-foreground -ms-1 me-3" size={16} aria-hidden="true" />
					<span className="text-muted-foreground">Search...</span>
				</span>
				<kbd className="bg-accent text-accent-foreground ms-12 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
					⌘K
				</kbd>
			</Button>
			<CommandDialog open={open} onOpenChange={setOpen}>
				<DialogTitle className="sr-only">Search input</DialogTitle>
				<CommandInput placeholder="Type a command or search..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Quick start">
						<CommandItem>
							<FolderPlusIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>New folder</span>
							<CommandShortcut className="justify-center">⌘N</CommandShortcut>
						</CommandItem>
						<CommandItem>
							<FileInputIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>Import document</span>
							<CommandShortcut className="justify-center">⌘I</CommandShortcut>
						</CommandItem>
						<CommandItem>
							<CircleFadingPlusIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>Add block</span>
							<CommandShortcut className="justify-center">⌘B</CommandShortcut>
						</CommandItem>
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading="Navigation">
						<CommandItem>
							<ArrowUpRightIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>Go to dashboard</span>
						</CommandItem>
						<CommandItem>
							<ArrowUpRightIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>Go to apps</span>
						</CommandItem>
						<CommandItem>
							<ArrowUpRightIcon size={16} className="opacity-60" aria-hidden="true" />
							<span>Go to connections</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	);
}
