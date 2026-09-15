"use client";

import { headlessToast } from "@repo/ui/components/headless-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useState } from "react";
import { serializeFilters } from "../filter/serialization";
import { useBoardViewState } from "../filter/use-board-view-state";
import { usePersonalViews } from "./use-personal-views";

/**
 * "Save current filters + grouping/view state as a personal view" flow —
 * a small popover, not a full dialog, since the only real input is a name.
 */
export function SaveViewPopover() {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [saving, setSaving] = useState(false);
	const { filters, grouping, subGrouping, viewMode, showCompletedTasks, sortBy, sortDirection } = useBoardViewState();
	const { createView } = usePersonalViews();

	const handleSave = async () => {
		const trimmed = name.trim();
		if (!trimmed || saving) return;
		setSaving(true);
		try {
			await createView({
				name: trimmed,
				filterParams: serializeFilters(filters),
				viewConfig: {
					mode: viewMode,
					groupBy: grouping,
					subGroupBy: subGrouping,
					showCompletedTasks,
					sortBy,
					sortDirection,
				},
			});
			headlessToast.success({ title: "View saved", description: `"${trimmed}" added to your views` });
			setName("");
			setOpen(false);
		} catch {
			headlessToast.error({ title: "Failed to save view" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<button
						type="button"
						className="flex items-center gap-1.5 h-6 px-2 shrink-0 rounded-full text-xs border border-border text-muted-foreground hover:bg-accent transition-colors"
					>
						<IconDeviceFloppy className="size-3.5" />
						Save view
					</button>
				}
			/>
			<PopoverContent className="w-64 p-2" align="start">
				<div className="flex flex-col gap-2">
					<input
						type="text"
						value={name}
						onChange={(event) => setName(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") handleSave();
						}}
						placeholder="View name..."
						// biome-ignore lint/a11y/noAutofocus: popover content, opening it is the user's explicit intent to name a view
						autoFocus
						className="h-7 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
					<button
						type="button"
						onClick={handleSave}
						disabled={!name.trim() || saving}
						className={cn(
							"h-7 rounded-md text-xs font-medium transition-colors",
							name.trim() && !saving
								? "bg-primary text-primary-foreground hover:bg-primary/90"
								: "bg-muted text-muted-foreground cursor-not-allowed"
						)}
					>
						{saving ? "Saving..." : "Save current view"}
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
