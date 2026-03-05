"use client";
import { createReleaseAction } from "@/lib/fetches/release";
import { useToastAction } from "@/lib/util";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useState } from "react";
import RenderIcon from "@/components/generic/RenderIcon";
import IconPicker from "@/components/generic/icon-picker";

interface CreateReleaseDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** When true, blocks creating releases (plan limit). */
	disabled?: boolean;
	/** Message to show when creation is blocked by plan limits. */
	disabledMessage?: string;
}

export function CreateReleaseDialog({ open, onOpenChange, disabled = false, disabledMessage }: CreateReleaseDialogProps) {
	const { organization, releases, setReleases } = useLayoutOrganization();
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const { runWithToast, isFetching } = useToastAction();

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [color, setColor] = useState({
		hsla: "#3B82F6",
		hex: "#3B82F6",
	});
	const [icon, setIcon] = useState<string>("IconRocket");
	const [status, setStatus] = useState<"planned" | "in-progress" | "released" | "archived">("planned");

	const handleCreate = async () => {
		if (!name.trim() || !slug.trim()) {
			return;
		}

		const data = await runWithToast(
			"create-release",
			{
				loading: {
					title: "Creating release...",
					description: "Creating your new release.",
				},
				success: {
					title: "Release created",
					description: "Your release has been created successfully.",
				},
				error: {
					title: "Failed to create release",
					description: "An error occurred while creating your release.",
				},
			},
			() =>
				createReleaseAction(
					organization.id,
					{
						name,
						slug,
						color: color.hsla,
						icon,
						status,
					},
					wsClientId
				)
		);

		if (data?.success && data.data) {
			// Add new release to the list
			setReleases([...releases, data.data]);
			// Reset form
			setName("");
			setSlug("");
			setColor({ hsla: "#3B82F6", hex: "#3B82F6" });
			setIcon("IconRocket");
			setStatus("planned");
			onOpenChange(false);
		}
	};

	const handleNameChange = (value: string) => {
		setName(value);
		// Auto-generate slug from name if slug is empty
		if (!slug) {
			setSlug(
				value
					.toLowerCase()
					.replace(/[^a-z0-9-_.]/g, "-")
					.replace(/--+/g, "-")
					.replace(/^-|-$/g, "")
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Create New Release</DialogTitle>
					<DialogDescription>Create a new release to track tasks and milestones.</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-4">
					{/* Icon and Color Picker */}
					<div className="flex flex-col gap-2">
						<Label>Icon & Color</Label>
						<Popover modal>
							<PopoverTrigger asChild>
								<Button variant="outline" className="w-16 h-16 p-0 overflow-hidden">
									<RenderIcon iconName={icon} color={color.hsla} button className="size-16 [&_svg]:size-8" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="p-0 w-64 md:w-96">
								<div className="flex flex-col gap-3">
									<div className="p-3">
										<ColorPickerCustom onChange={setColor} defaultValue={color.hex} height={100} />
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
					</div>

					{/* Name */}
					<div className="flex flex-col gap-2">
						<Label htmlFor="release-name">Name</Label>
						<Input
							id="release-name"
							placeholder="e.g., v1.0.0, Q1 2024"
							value={name}
							onChange={(e) => handleNameChange(e.target.value)}
						/>
					</div>

					{/* Slug */}
					<div className="flex flex-col gap-2">
						<Label htmlFor="release-slug">Slug</Label>
						<Input
							id="release-slug"
							placeholder="e.g., v1-0-0, q1-2024"
							value={slug}
							onChange={(e) =>
								setSlug(
									e.target.value
										.toLowerCase()
										.replace(/[^a-z0-9-_.]/g, "-")
										.replace(/--+/g, "-")
								)
							}
						/>
						<p className="text-xs text-muted-foreground">
							Used in URLs: /{organization.slug}/releases/{slug || "..."}
						</p>
					</div>

					{/* Status */}
					<div className="flex flex-col gap-2">
						<Label htmlFor="release-status">Status</Label>
						<Select value={status} onValueChange={(val) => setStatus(val as typeof status)}>
							<SelectTrigger id="release-status">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="planned">Planned</SelectItem>
									<SelectItem value="in-progress">In Progress</SelectItem>
									<SelectItem value="released">Released</SelectItem>
									<SelectItem value="archived">Archived</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					{disabled && disabledMessage && (
						<p className="text-xs text-destructive mr-auto self-center">{disabledMessage}</p>
					)}
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isFetching}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!name.trim() || !slug.trim() || isFetching || disabled}>
						Create Release
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
