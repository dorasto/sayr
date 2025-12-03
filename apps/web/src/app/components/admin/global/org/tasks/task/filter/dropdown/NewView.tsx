"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { useState } from "react";
import { createSavedViewAction } from "@/app/lib/fetches/organization"; // you'll implement this similar to createLabelAction
import { useToastAction } from "@/app/lib/util";

interface Props {
	organizationId: string;
	setViews: (newValue: schema.savedViewType[]) => void;
	currentFilters: string; // e.g. URL param value (filters=....)
	viewConfig?: Record<string, unknown>;
}

export function NewViewPopover({ organizationId, setViews, currentFilters, viewConfig }: Props) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [name, setName] = useState("");
	const { runWithToast, isFetching } = useToastAction();

	const handleSave = async () => {
		if (!name) return;

		const data = await runWithToast(
			"create-view",
			{
				loading: {
					title: "Saving view...",
					description: "Please wait while your view is saved.",
				},
				success: {
					title: "View saved",
					description: "Your view has been successfully saved.",
				},
				error: {
					title: "Failed to save view",
					description: "An error occurred while saving your view.",
				},
			},
			() =>
				createSavedViewAction(
					organizationId,
					{
						name,
						value: currentFilters,
						viewConfig,
					},
					wsClientId
				)
		);

		if (data?.success && data.data) {
			setViews(data.data);
			setName("");
		}
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="accent" className={cn("gap-2 h-6 bg-accent border-transparent p-1 w-fit")}>
					Save
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0 border-0" align="start">
				<InputGroup>
					<InputGroupInput placeholder="View name..." value={name} onChange={(e) => setName(e.target.value)} />
					<InputGroupAddon align="inline-end">
						<InputGroupButton variant="secondary" disabled={name.length === 0 || isFetching} onClick={handleSave}>
							Save
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</PopoverContent>
		</Popover>
	);
}
