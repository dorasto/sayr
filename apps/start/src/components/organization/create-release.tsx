"use client";
import {
	createReleaseAction,
	deleteReleaseAction,
	updateReleaseAction,
	markReleaseAsReleasedAction,
} from "@/lib/fetches/release";
import { useToastAction } from "@/lib/util";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconDeviceFloppy, IconTrash, IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import RenderIcon from "../generic/RenderIcon";
import IconPicker from "../generic/icon-picker";

interface Props {
	orgId: string;
	setReleases: (newValue: schema.releaseType[]) => void;
	release?: schema.releaseType;
	mode?: "create" | "edit";
	taskCount?: number;
	settingsUI?: boolean;
}

export default function CreateRelease({
	orgId,
	setReleases,
	release,
	mode = "create",
	taskCount = 0,
	settingsUI = false,
}: Props) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [name, setName] = useState(release?.name || "");
	const [slug, setSlug] = useState(release?.slug || "");
	const [color, setColor] = useState({
		hsla: release?.color || "#3B82F6",
		hex: release?.color || "#3B82F6",
	});
	const [icon, setIcon] = useState<string>(release?.icon || "IconRocket");
	const [status, setStatus] = useState<"planned" | "in-progress" | "released" | "archived">(
		release?.status || "planned"
	);
	const { runWithToast, isFetching } = useToastAction();

	const isEditMode = mode === "edit" && release;
	const change =
		name !== release?.name ||
		slug !== release?.slug ||
		color.hsla !== release?.color ||
		icon !== release?.icon ||
		status !== release?.status;

	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const [confirmReleaseOpen, setConfirmReleaseOpen] = useState(false);

	useEffect(() => {
		if (isEditMode) {
			setName(release?.name || "");
			setSlug(release?.slug || "");
			setColor({
				hsla: release?.color || "#3B82F6",
				hex: release?.color || "#3B82F6",
			});
			setIcon(release?.icon || "IconRocket");
			setStatus(release?.status || "planned");
		}
	}, [isEditMode, release?.color, release?.name, release?.icon, release?.slug, release?.status]);

	return (
		<div className="h-auto">
			<InputGroup
				className={cn(
					"h-auto bg-accent border-transparent group/group",
					settingsUI && "bg-card flex items-center gap-1"
				)}
			>
				<InputGroupAddon align="inline-start" className="h-full">
					<InputGroupButton asChild>
						<Popover modal>
							<PopoverTrigger asChild>
								<Button
									variant={"accent"}
									className="h-auto w-auto p-0 border-transparent rounded-lg overflow-hidden"
								>
									<RenderIcon
										iconName={icon}
										color={color.hsla}
										button
										className={cn(settingsUI && "size-8 [&_svg]:size-5")}
									/>
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
					</InputGroupButton>
				</InputGroupAddon>

				<InputGroupInput
					className={cn("", settingsUI && "hover:bg-accent focus-within:bg-accent h-8")}
					placeholder="Release name (e.g., v1.0.0)"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				<InputGroupInput
					className={cn("w-40", settingsUI && "hover:bg-accent focus-within:bg-accent h-8")}
					placeholder="Slug"
					value={slug}
					onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_.]/g, ""))}
				/>

				{isEditMode && (
					<InputGroupAddon align="inline-end">
						<Select value={status} onValueChange={(val) => setStatus(val as typeof status)}>
							<SelectTrigger className="h-8 w-32 border-0 bg-transparent">
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
					</InputGroupAddon>
				)}

				{isEditMode ? (
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							variant="ghost"
							size="sm"
							className="text-xs text-muted-foreground h-auto py-1 px-2 cursor-default"
						>
							{taskCount} {taskCount === 1 ? "task" : "tasks"}
						</InputGroupButton>
					</InputGroupAddon>
				) : (
					<InputGroupAddon align="inline-end" className="invisible">
						<Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto py-1 px-2">
							{taskCount} {taskCount === 1 ? "task" : "tasks"}
						</Button>
					</InputGroupAddon>
				)}

				{/* ------- Create Mode ------- */}
				{!isEditMode ? (
					<InputGroupAddon align="inline-end">
						{name.length !== 0 && slug.length !== 0 && (
							<InputGroupButton
								variant="ghost"
								className="h-full"
								onClick={async () => {
									const result = await runWithToast(
										"create-release",
										{
											loading: {
												title: "Creating release...",
												description: "Please wait while we create the release.",
											},
											success: {
												title: "Release created",
												description: "The release has been successfully created.",
											},
											error: {
												title: "Failed to create release",
												description: "An error occurred while creating the release.",
											},
										},
										() =>
											createReleaseAction(
												orgId,
												{
													name,
													slug,
													color: color.hsla,
													icon,
													status: "planned",
												},
												wsClientId
											)
									);
									if (result?.success && result.data) {
										// Update releases list with new release
										setReleases([result.data]);
										setName("");
										setSlug("");
										setColor({
											hsla: "#3B82F6",
											hex: "#3B82F6",
										});
										setIcon("IconRocket");
									}
								}}
								disabled={name.length === 0 || slug.length === 0 || isFetching}
							>
								Save
							</InputGroupButton>
						)}
					</InputGroupAddon>
				) : (
					/* ------- Edit Mode ------- */
					<InputGroupAddon align="inline-end">
						{change ? (
							<InputGroupButton
								variant="ghost"
								className="h-full"
								onClick={async () => {
									const result = await runWithToast(
										"edit-release",
										{
											loading: {
												title: "Updating release...",
												description: "Please wait while we update the release.",
											},
											success: {
												title: "Release updated",
												description: "The release has been successfully updated.",
											},
											error: {
												title: "Failed to update release",
												description: "An error occurred while updating the release.",
											},
										},
										() =>
											updateReleaseAction(
												orgId,
												release.id,
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
									if (result?.success && result.data) {
										setReleases([result.data]);
									}
								}}
								disabled={isFetching}
							>
								<IconDeviceFloppy />
							</InputGroupButton>
						) : (
							<>
								{/* Mark as Released Button (only for non-released statuses) */}
								{status !== "released" && status !== "archived" && (
									<Popover open={confirmReleaseOpen} onOpenChange={setConfirmReleaseOpen}>
										<PopoverTrigger asChild>
											<InputGroupButton
												variant="ghost"
												className={cn(
													"h-full",
													settingsUI && "opacity-0 group-hover/group:opacity-100 transition-all"
												)}
											>
												<IconCheck />
											</InputGroupButton>
										</PopoverTrigger>
										<PopoverContent className="w-80">
											<div className="flex flex-col gap-4">
												<div className="space-y-2">
													<h4 className="font-medium">Mark as Released?</h4>
													<p className="text-sm text-muted-foreground">
														This will mark the release as released and auto-close all incomplete tasks (
														{taskCount} tasks).
													</p>
												</div>
												<div className="flex gap-2">
													<Button
														variant="outline"
														size="sm"
														onClick={() => setConfirmReleaseOpen(false)}
														className="flex-1"
													>
														Cancel
													</Button>
													<Button
														variant="default"
														size="sm"
														className="flex-1"
														onClick={async () => {
															const result = await runWithToast(
																"mark-release-released",
																{
																	loading: {
																		title: "Marking release as released...",
																		description: "Closing incomplete tasks...",
																	},
																	success: {
																		title: "Release marked as released",
																		description: "All incomplete tasks have been closed.",
																	},
																	error: {
																		title: "Failed to mark as released",
																		description: "An error occurred.",
																	},
																},
																() => markReleaseAsReleasedAction(orgId, release.id, wsClientId)
															);
															if (result?.success && result.data) {
																setReleases([result.data.release]);
																setStatus("released");
																setConfirmReleaseOpen(false);
															}
														}}
													>
														Mark as Released
													</Button>
												</div>
											</div>
										</PopoverContent>
									</Popover>
								)}

								{/* Delete Button */}
								<Popover open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
									<PopoverTrigger asChild>
										<InputGroupButton
											variant="ghost"
											className={cn(
												"h-full",
												settingsUI && "opacity-0 group-hover/group:opacity-100 transition-all"
											)}
										>
											<IconTrash />
										</InputGroupButton>
									</PopoverTrigger>
									<PopoverContent className="w-80">
										<div className="flex flex-col gap-4">
											<div className="space-y-2">
												<h4 className="font-medium">Delete Release?</h4>
												<p className="text-sm text-muted-foreground">
													This will remove the release and unassign all tasks from it ({taskCount} tasks).
												</p>
											</div>
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => setConfirmDeleteOpen(false)}
													className="flex-1"
												>
													Cancel
												</Button>
												<Button
													variant="destructive"
													size="sm"
													className="flex-1"
													onClick={async () => {
														const result = await runWithToast(
															"delete-release",
															{
																loading: {
																	title: "Deleting release...",
																	description: "Please wait...",
																},
																success: {
																	title: "Release deleted",
																	description: "The release has been removed.",
																},
																error: {
																	title: "Failed to delete release",
																	description: "An error occurred.",
																},
															},
															() => deleteReleaseAction(orgId, release.id, wsClientId)
														);
														if (result?.success) {
															// Remove release from list
															setReleases([]);
															setConfirmDeleteOpen(false);
														}
													}}
												>
													Delete
												</Button>
											</div>
										</div>
									</PopoverContent>
								</Popover>
							</>
						)}
					</InputGroupAddon>
				)}
			</InputGroup>
		</div>
	);
}
