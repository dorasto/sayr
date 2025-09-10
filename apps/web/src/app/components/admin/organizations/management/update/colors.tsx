"use client";

import { Button } from "@repo/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPicker from "@repo/ui/components/tomui/color-picker";
import { cn } from "@repo/ui/lib/utils";
import { IconCircleFilled } from "@tabler/icons-react";
import { useState } from "react";

export default function Colors() {
	const [primary, setPrimary] = useState("#ff0000");
	// Available colours:
	// Background, Foreground, Primary, Secondary
	// Based off these, we'll generate shades and others provided context. For example, for a card background we can calculate
	// a shade based off the background colour potentially.
	// We will provide very minimal styling options, as the goal is to have a consistent design system.
	// We'll also likely have some "defaults" that can be reset to.
	return (
		<div className="flex flex-col gap-3 w-fit">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" className="justify-start">
						<IconCircleFilled className={cn(`text-[${primary}]`)} />
						Background
					</Button>
				</PopoverTrigger>
				<PopoverContent>
					<ColorPicker
						showDebugInfo
						// value={primary}
						// onChange={setPrimary}
					/>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" className="justify-start">
						<IconCircleFilled className={cn(`text-[${primary}]`)} />
						Foreground
					</Button>
				</PopoverTrigger>
				<PopoverContent>
					<ColorPicker
						showDebugInfo
						// value={primary}
						// onChange={setPrimary}
					/>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" className="justify-start">
						<IconCircleFilled className={cn(`text-[${primary}]`)} />
						Primary
					</Button>
				</PopoverTrigger>
				<PopoverContent>
					<ColorPicker
						showDebugInfo
						// value={primary}
						// onChange={setPrimary}
					/>
				</PopoverContent>
			</Popover>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline" className="justify-start">
						<IconCircleFilled className={cn(`text-[${primary}]`)} />
						Secondary
					</Button>
				</PopoverTrigger>
				<PopoverContent>
					<ColorPicker
						showDebugInfo
						// value={primary}
						// onChange={setPrimary}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
