"use client";

import { Button } from "@repo/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPickerCustom, { hslaStringToHex } from "@repo/ui/components/tomui/color-picker-custom";
import { cn } from "@repo/ui/lib/utils";
import IconPicker from "@/components/generic/icon-picker";
import RenderIcon from "@/components/generic/RenderIcon";

export const DEFAULT_VIEW_ICON = "IconBookmark";
export const DEFAULT_VIEW_COLOR = "hsla(0, 0%, 0%, 1)";

export interface ViewIconColorValue {
	icon: string;
	color: string;
}

interface ViewIconColorTriggerProps {
	value: ViewIconColorValue;
	onChange: (value: ViewIconColorValue) => void;
	className?: string;
}

/**
 * Popover trigger showing the current icon tinted by the current color; content stacks
 * ColorPickerCustom over IconPicker — same shape as the org saved-view/category create flow
 * (read-only reference: components/tasks/filter/new-view.tsx and
 * pages/admin/settings/orgId/view-detail.tsx), built fresh here from the three generic
 * primitives (Popover, ColorPickerCustom, IconPicker/RenderIcon) only, no components/tasks/**
 * import. Storage convention: color as an HSLA string, icon as a bare Tabler component name
 * string — matches category/release schema defaults, not the read-only reference's white
 * default (which would be invisible against this app's chrome).
 */
export function ViewIconColorTrigger({ value, onChange, className }: ViewIconColorTriggerProps) {
	const icon = value.icon || DEFAULT_VIEW_ICON;
	const color = value.color || DEFAULT_VIEW_COLOR;

	return (
		<Popover modal>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="accent"
						className={cn("h-auto w-auto shrink-0 overflow-hidden rounded-lg border-transparent p-0", className)}
					>
						<RenderIcon iconName={icon} color={color} button className="size-8 [&_svg]:size-5" />
					</Button>
				}
			/>
			<PopoverContent className="w-64 p-0 md:w-96" align="start">
				<div className="flex flex-col gap-3">
					<div className="p-3">
						<ColorPickerCustom
							value={hslaStringToHex(color)}
							onChange={({ hsla }) => onChange({ icon, color: hsla })}
							height={100}
						/>
					</div>
					<div className="px-3 pb-3">
						<IconPicker value={icon} update={(newIcon) => onChange({ icon: newIcon, color })} />
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
