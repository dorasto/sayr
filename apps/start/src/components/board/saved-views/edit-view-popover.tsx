"use client";

import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { IconPencil } from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import { usePersonalViews } from "./use-personal-views";
import { DEFAULT_VIEW_COLOR, DEFAULT_VIEW_ICON, ViewIconColorTrigger } from "./view-icon-color-trigger";

const stopRowSelect = (event: React.SyntheticEvent) => event.stopPropagation();

function iconColorFromView(view: schema.savedViewType) {
	return {
		icon: view.viewConfig?.icon || DEFAULT_VIEW_ICON,
		color: view.viewConfig?.color || DEFAULT_VIEW_COLOR,
	};
}

interface EditViewPopoverProps {
	view: schema.savedViewType;
}

/**
 * Rename + icon/color edit for an existing personal view — the row-level counterpart to
 * SaveViewPopover's create flow, triggered via a pencil button alongside pin/delete on each
 * row in both PresetSwitcherContent and PresetSwitcher. Pre-fills from the view's current
 * name/viewConfig, falling back to the shared defaults for legacy views with no icon/color
 * ever set — doesn't crash or clobber unrelated viewConfig fields (mode/groupBy/sortBy/etc)
 * on save, only touches name/icon/color.
 */
export function EditViewPopover({ view }: EditViewPopoverProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(view.name);
	const [iconColor, setIconColor] = useState(() => iconColorFromView(view));
	const [saving, setSaving] = useState(false);
	const { updateView } = usePersonalViews();

	const handleOpenChange = (next: boolean) => {
		if (next) {
			// Re-derive from the view's current values each time it's reopened, in case it
			// changed elsewhere since this popover was last open.
			setName(view.name);
			setIconColor(iconColorFromView(view));
		}
		setOpen(next);
	};

	const handleSave = async () => {
		const trimmed = name.trim();
		if (!trimmed || saving) return;
		setSaving(true);
		try {
			await updateView(view.id, {
				name: trimmed,
				viewConfig: {
					mode: view.viewConfig?.mode ?? "list",
					groupBy: view.viewConfig?.groupBy ?? "status",
					subGroupBy: view.viewConfig?.subGroupBy,
					showCompletedTasks: view.viewConfig?.showCompletedTasks ?? true,
					sortBy: view.viewConfig?.sortBy,
					sortDirection: view.viewConfig?.sortDirection,
					icon: iconColor.icon,
					color: iconColor.color,
				},
			});
			headlessToast.success({ title: "View updated" });
			setOpen(false);
		} catch {
			headlessToast.error({ title: "Failed to update view" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				render={
					<button
						type="button"
						onPointerDown={stopRowSelect}
						onClick={stopRowSelect}
						className="shrink-0 text-muted-foreground hover:text-foreground"
						title="Edit view"
					>
						<IconPencil className="size-3.5" />
					</button>
				}
			/>
			<PopoverContent className="w-64 p-2" align="start" onClick={stopRowSelect}>
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-1.5">
						<ViewIconColorTrigger value={iconColor} onChange={setIconColor} />
						<input
							type="text"
							value={name}
							onChange={(event) => setName(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") handleSave();
							}}
							placeholder="View name..."
							// biome-ignore lint/a11y/noAutofocus: popover content, opening it is the user's explicit intent to edit
							autoFocus
							className="h-7 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
						/>
					</div>
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
						{saving ? "Saving..." : "Save changes"}
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
