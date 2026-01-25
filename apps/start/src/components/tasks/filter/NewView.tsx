"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { generateSlug } from "@repo/util";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useState } from "react";
import IconPicker from "@/components/generic/icon-picker";
import RenderIcon from "@/components/generic/RenderIcon";
import { createSavedViewAction } from "@/lib/fetches/organization";
import { useToastAction } from "@/lib/util";

interface Props {
	organizationId: string;
	setViews: (newValue: schema.savedViewType[]) => void;
	currentFilters: string; // e.g. URL param value (filters=....)
	viewConfig?: Record<string, unknown>;
}

export function NewViewPopover({ organizationId, setViews, currentFilters, viewConfig }: Props) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [name, setName] = useState("");
	const [color, setColor] = useState({
		hsla: "hsla(0, 0%, 100%, 1)",
		hex: "#ffffff",
	});
	const [icon, setIcon] = useState<string>("IconStack2");
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
						slug: generateSlug(name),
						logo: "",
						value: currentFilters,
						// biome-ignore lint/suspicious/noExplicitAny: Casting to any for viewConfig
						viewConfig: { ...viewConfig, color: color.hsla, icon } as any,
					},
					wsClientId
				)
		);

		if (data?.success && data.data) {
			setViews(data.data);
			setName("");
			setColor({ hsla: "hsla(0, 0%, 100%, 1)", hex: "#ffffff" });
			setIcon("IconStack2");
		}
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="primary" className={cn("gap-2 h-6 w-fit p-1 text-xs")}>
					<IconDeviceFloppy className="w-4 h-4" />
					Save
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0 border-0" align="start">
				<InputGroup>
					<InputGroupAddon align="inline-start" className="h-full">
						<InputGroupButton asChild>
							<Popover modal>
								<PopoverTrigger asChild>
									<Button
										variant={"accent"}
										className="h-auto w-auto p-0 border-transparent rounded-lg overflow-hidden"
									>
										<RenderIcon iconName={icon} color={color.hsla} button className="size-8 [&_svg]:size-5" />
									</Button>
								</PopoverTrigger>
								<PopoverContent className="p-0 w-64 md:w-96">
									<div className="flex flex-col gap-3">
										<div className="p-3">
											<ColorPickerCustom
												onChange={setColor}
												defaultValue={color.hex}
												height={100}
												showDebugInfo={true}
											/>
										</div>
										<div className="px-3">
											<IconPicker
												value={icon}
												update={(value: string): void => {
													setIcon(value);
												}}
											/>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</InputGroupButton>
					</InputGroupAddon>
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
