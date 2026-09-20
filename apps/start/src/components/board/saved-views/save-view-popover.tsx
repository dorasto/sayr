import { Button, type ButtonProps } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { IconDeviceFloppy } from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import { serializeFilters } from "../filter/serialization";
import { useBoardViewState } from "../filter/use-board-view-state";
import { usePersonalViews } from "./use-personal-views";
import { DEFAULT_VIEW_COLOR, DEFAULT_VIEW_ICON, ViewIconColorTrigger } from "./view-icon-color-trigger";

const DEFAULT_ICON_COLOR = {
	icon: DEFAULT_VIEW_ICON,
	color: DEFAULT_VIEW_COLOR,
};

// Stops a nested-Popover interaction (trigger click, content click) from
// bubbling up into an outer overlay (e.g. ActiveViewSwitcher's DropdownMenu)
// and closing it — same pattern edit-view-popover.tsx already uses for the
// identical reason (Popover nested inside a Dropdown/ComboBox row).
const stopRowSelect = (event: React.SyntheticEvent) => event.stopPropagation();

interface SaveViewPopoverProps {
	triggerLabel?: string;
	triggerClassName?: string;
	triggerVariant?: ButtonProps["variant"];
}

/**
 * "Save current filters + grouping/view state as a personal view" flow —
 * a small popover, not a full dialog, since the only real input is a name
 * (plus the icon/color trigger next to it). Nested inside ActiveViewSwitcher's
 * dropdown, styled to match a plain DropdownMenuItem row rather than a pill —
 * `triggerLabel`/`triggerClassName`/`triggerVariant` let a caller adapt the
 * trigger without forking the popover.
 */
export function SaveViewPopover({
	triggerLabel = "Save view",
	triggerClassName,
	triggerVariant = "outline",
}: SaveViewPopoverProps = {}) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [iconColor, setIconColor] = useState(DEFAULT_ICON_COLOR);
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
					icon: iconColor.icon,
					color: iconColor.color,
				},
			});
			headlessToast.success({
				title: "View saved",
				description: `"${trimmed}" added to your views`,
			});
			setName("");
			setIconColor(DEFAULT_ICON_COLOR);
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
					<Button
						type="button"
						variant={triggerVariant}
						data-command-target="save-view-trigger"
						onPointerDown={stopRowSelect}
						onClick={stopRowSelect}
						className={cn("h-6 gap-1.5 rounded-full px-2 text-xs shrink-0", triggerClassName)}
					>
						<IconDeviceFloppy className="size-4" />
						{triggerLabel}
					</Button>
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
