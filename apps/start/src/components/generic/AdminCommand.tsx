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
import type {
  CommandGroup as CommandGroupType,
  CommandItem as CommandItemType,
} from "@/types/command";

export default function AdminCommand() {
  const open = useStore(commandStore, (state) => state.open);
  const initialView = useStore(commandStore, (state) => state.initialView);
  const [viewStack, setViewStack] = React.useState<string[]>(["root"]);
  const [search, setSearch] = React.useState("");
  const commands = useCommandRegistry();
  const { results: searchResults, isSearching } = useCommandSearch(
    search,
    open,
  );

  const activeView = viewStack[viewStack.length - 1] || "root";
  const activeGroups = commands[activeView] || [];

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

  // When opening, auto-drill into the initial view if one is set
  // When closing, reset the stack
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

  // Derive the badge label for the current sub-view
  // Only shows a badge when an initialView is explicitly set (e.g. task page),
  // not for generic sub-views like "Switch organization"
  const viewBadge = React.useMemo(() => {
    if (viewStack.length <= 1) return null;
    if (initialView && activeView === initialView.viewId) {
      return initialView.label;
    }
    return null;
  }, [viewStack.length, activeView, initialView]);

  const handleSelect = (item: CommandItemType) => {
    if (item.subId) {
      setViewStack((prev) => [...prev, item.subId as string]);
      setSearch("");
    } else if (item.action) {
      item.action();
      if (item.closeOnSelect !== false) {
        commandActions.close();
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

  const hasSearchResults = searchResults.length > 0;

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={commandActions.setOpen}
        showOverlay={false}
      >
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
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <IconLoader2 className="h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </div>
            ) : (
              "No results found."
            )}
          </CommandEmpty>

          {/* Search results from server-side task search */}
          {hasSearchResults && (
            <>
              <CommandGroup heading="Tasks">
                {searchResults.map((item: CommandItemType) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                    value={item.id}
                    keywords={[
                      item.label,
                      ...(item.keywords ? [item.keywords] : []),
                    ]}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                    {item.metadata && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        {item.metadata}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {activeGroups.length > 0 && <CommandSeparator />}
            </>
          )}

          {/* Loading indicator when searching */}
          {isSearching && !hasSearchResults && search.length >= 2 && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
              <IconLoader2 className="h-4 w-4 animate-spin" />
              <span>Searching tasks...</span>
            </div>
          )}

          {/* Static + dynamic command groups */}
          {activeGroups.map((group: CommandGroupType, groupIndex: number) => (
            <React.Fragment key={group.heading}>
              <CommandGroup heading={group.heading}>
                {group.items.map((item: CommandItemType) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => handleSelect(item)}
                    value={item.id}
                    keywords={[
                      item.label,
                      ...(item.keywords ? [item.keywords] : []),
                    ]}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                    {item.metadata && (
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        {item.metadata}
                      </span>
                    )}
                    {item.shortcut && (
                      <CommandShortcut className="justify-center">
                        {item.shortcut}
                      </CommandShortcut>
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
