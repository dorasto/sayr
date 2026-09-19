import type { schema } from "@repo/database";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
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
	triggerClassName?: string;
}

/**
 * Rename + icon/color edit for an existing personal view — the row-level counterpart to
 * SaveViewPopover's create flow, triggered via a pencil button alongside pin/delete on each
 * row in both PresetSwitcherContent and PresetSwitcher. Pre-fills from the view's current
 * name/viewConfig, falling back to the shared defaults for legacy views with no icon/color
 * ever set — doesn't crash or clobber unrelated viewConfig fields (mode/groupBy/sortBy/etc)
 * on save, only touches name/icon/color. `triggerClassName` lets a caller adapt the trigger's
 * own visibility treatment (e.g. active-view-switcher.tsx's hover-reveal) without forking.
 */
export function EditViewPopover({ view, triggerClassName }: EditViewPopoverProps) {
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
						className={cn("shrink-0 rounded p-1 text-muted-foreground hover:text-foreground", triggerClassName)}
						title="Edit view"
					>
						<IconPencil className="size-3.5" />
					</button>
				}
			/>
			<PopoverContent className="w-72 p-2" align="start" onClick={stopRowSelect}>
				<InputGroup>
					<InputGroupAddon align="inline-start">
						<ViewIconColorTrigger value={iconColor} onChange={setIconColor} />
					</InputGroupAddon>
					<InputGroupInput
						value={name}
						onChange={(event) => setName(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") handleSave();
						}}
						placeholder="View name..."
						autoFocus
					/>
					<InputGroupAddon align="inline-end">
						<InputGroupButton variant="secondary" disabled={!name.trim() || saving} onClick={handleSave}>
							{saving ? "Saving..." : "Save"}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</PopoverContent>
		</Popover>
	);
}
