"use client";

import { Button } from "@repo/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import {
	ColorPicker,
	ColorPickerAlpha,
	ColorPickerEyeDropper,
	ColorPickerFormat,
	ColorPickerHue,
	ColorPickerOutput,
	ColorPickerSelection,
} from "@repo/ui/components/ui/kibo-ui/color-picker/index";

export default function Colors() {
	// Available colours:
	// Background, Foreground, Primary, Secondary
	// Based off these, we'll generate shades and others provided context. For example, for a card background we can calculate
	// a shade based off the background colour potentially.
	// We will provide very minimal styling options, as the goal is to have a consistent design system.
	// We'll also likely have some "defaults" that can be reset to.
	return (
		<div className="">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">Background</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0 w-full">
					<ColorPicker className="w-full aspect-video rounded-md border bg-background p-4 shadow-sm">
						<ColorPickerSelection />
						<div className="flex items-center gap-4">
							<ColorPickerEyeDropper />
							<div className="grid w-full gap-1">
								<ColorPickerHue />
								<ColorPickerAlpha />
							</div>
						</div>
						<div className="flex items-center gap-2">
							<ColorPickerOutput />
							<ColorPickerFormat />
						</div>
					</ColorPicker>
				</PopoverContent>
			</Popover>
		</div>
	);
}
