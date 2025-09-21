"use client";
import type { PartialBlock } from "@blocknote/core";
import {
	AdaptiveDialog,
	AdaptiveDialogContent,
	AdaptiveDialogDescription,
	AdaptiveDialogFooter,
	AdaptiveDialogHeader,
	AdaptiveDialogTitle,
} from "@repo/ui/components/adaptive-dialog";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPicker from "@repo/ui/components/tomui/color-picker";
import { cn } from "@repo/ui/lib/utils";
import { IconCheck, IconCircleFilled } from "@tabler/icons-react";

export default function CreateLabel() {
	return (
		<div className="flex items-center gap-3 bg-accent border rounded p-1">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="accent" size={"icon"} className="shrink-0">
						<IconCircleFilled className={cn(`text-color...`)} />
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
			<Input
				variant={"ghost"}
				placeholder="Label name"
				className="bg-transparent"

				// value={title}
				// onChange={(e) => setTitle(e.target.value)}
			/>
			<Button variant="accent" size={"icon"} className="shrink-0">
				<IconCheck />
			</Button>
		</div>
	);
}
