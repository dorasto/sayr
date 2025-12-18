"use client";
import { useToastAction } from "@/lib/util";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import { Tile, TileAction, TileHeader, TileIcon, TileTitle } from "@repo/ui/components/doras-ui/tile";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Label } from "@repo/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { cn } from "@repo/ui/lib/utils";
import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import RenderIcon from "../generic/RenderIcon";
import IconPicker from "../generic/icon-picker";
import { createCategoryAction, deleteCategoryAction, editCategoryAction } from "@/lib/fetches/organization";

interface Props {
	orgId: string;
	setCategories: (newValue: schema.categoryType[]) => void;
	category?: schema.categoryType;
	mode?: "create" | "edit";
	taskCount?: number;
	onCategoryClick?: (categoryId: string) => void;
	settingsUI?: boolean;
}

export default function CreateCategory({
	orgId,
	setCategories,
	category,
	mode = "create",
	taskCount = 0,
	onCategoryClick,
	settingsUI = false,
}: Props) {
	const { value: wsClientId } = useStateManagement<string>("ws-clientId", "");
	const [name, setName] = useState(category?.name || "");
	const [color, setColor] = useState({
		hsla: category?.color || "#000000",
		hex: category?.color || "#000000",
	});
	const [icon, setIcon] = useState<string>(category?.icon || "IconCircleFilled");
	const { runWithToast, isFetching } = useToastAction();

	const isEditMode = mode === "edit" && category;
	const change = name !== category?.name || color.hsla !== category?.color || icon !== category?.icon;

	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	useEffect(() => {
		if (isEditMode) {
			setName(category?.name || "");
			setColor({
				hsla: category?.color || "#F59E0B",
				hex: category?.color || "#F59E0B",
			});
			setIcon(category?.icon || "IconCircleFilled");
		}
	}, [isEditMode, category?.color, category?.name, category?.icon]);
	return (
		<div className="h-auto">
			<InputGroup
				className={cn(
					"h-auto bg-accent border-transparent group/group",
					settingsUI && "bg-card flex items-center gap-1 "
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
					placeholder="Category name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>

				{isEditMode ? (
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							variant="ghost"
							size="sm"
							className="text-xs text-muted-foreground h-auto py-1 px-2 cursor-pointer hover:text-foreground"
							onClick={() => {
								if (onCategoryClick && category) {
									onCategoryClick(category.id);
								}
							}}
							disabled={!onCategoryClick}
						>
							{taskCount} {taskCount === 1 ? "task" : "tasks"}
						</InputGroupButton>
					</InputGroupAddon>
				) : (
					<InputGroupAddon align="inline-end" className="invisible">
						<Button
							variant="ghost"
							size="sm"
							className="text-xs text-muted-foreground h-auto py-1 px-2 cursor-pointer hover:text-foreground"
						>
							{taskCount} {taskCount === 1 ? "task" : "tasks"}
						</Button>
					</InputGroupAddon>
				)}

				{/* ------- Create Mode ------- */}
				{!isEditMode ? (
					<InputGroupAddon align="inline-end">
						{name.length !== 0 && (
							<InputGroupButton
								variant="ghost"
								className="h-full"
								onClick={async () => {
									const data = await runWithToast(
										"create-category",
										{
											loading: {
												title: "Creating category...",
												description: "Please wait while we create the category.",
											},
											success: {
												title: "Category created",
												description: "The category has been successfully created.",
											},
											error: {
												title: "Failed to create category",
												description: "An error occurred while creating the category.",
											},
										},
										() =>
											createCategoryAction(
												orgId,
												{
													name,
													color: color.hsla,
													icon,
												},
												wsClientId
											)
									);
									if (data?.success && data.data) {
										setCategories(data.data);
										setName("");
										setColor({
											hsla: "#000000",
											hex: "#000000",
										});
										setIcon("");
									}
								}}
								disabled={name.length === 0 || isFetching}
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
									const data = await runWithToast(
										"edit-category",
										{
											loading: {
												title: "Updating category...",
												description: "Please wait while we update the category.",
											},
											success: {
												title: "Category updated",
												description: "The category has been successfully updated.",
											},
											error: {
												title: "Failed to update category",
												description: "An error occurred while updating the category.",
											},
										},
										() =>
											editCategoryAction(
												orgId,
												{
													id: category?.id,
													name,
													color: color.hsla,
													icon,
												},
												wsClientId
											)
									);
									if (data?.success && data.data) {
										setCategories(data.data);
										setName(data.data.find((e) => e.id === category?.id)?.name || "");
										setColor({
											hsla: data.data.find((e) => e.id === category?.id)?.color || "#000000",
											hex: data.data.find((e) => e.id === category?.id)?.color || "#000000",
										});
										setIcon(data.data.find((e) => e.id === category?.id)?.icon || "IconCircleFilled");
									}
								}}
								disabled={isFetching}
							>
								<IconDeviceFloppy />
							</InputGroupButton>
						) : (
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
								<PopoverContent className="p-0 flex flex-col gap-3">
									<Tile className="md:w-full p-3 bg-accent">
										<TileHeader>
											<TileIcon asChild>
												<RenderIcon iconName={icon} color={color.hsla} button />
											</TileIcon>
											<TileTitle className="flex items-center gap-2">{name}</TileTitle>
										</TileHeader>
										<TileAction>
											{taskCount} {taskCount === 1 ? "task" : "tasks"}
										</TileAction>
									</Tile>
									<div className="flex flex-col gap-3 p-3">
										<div className="flex items-center gap-1">
											<Label>Are you sure you want to delete this category?</Label>
										</div>
										<div className="flex justify-end gap-2">
											<ButtonGroup>
												<Button variant="outline" size="sm" onClick={() => setConfirmDeleteOpen(false)}>
													Cancel
												</Button>
												<Button
													variant="destructive"
													size="sm"
													onClick={async () => {
														const data = await runWithToast(
															"delete-category",
															{
																loading: {
																	title: "Deleting category...",
																	description: "Please wait while we delete the category.",
																},
																success: {
																	title: "Category deleted",
																	description: "The category has been successfully deleted.",
																},
																error: {
																	title: "Failed to delete category",
																	description: "An error occurred while deleting the category.",
																},
															},
															() =>
																deleteCategoryAction(
																	orgId,
																	{
																		id: category?.id,
																	},
																	wsClientId
																)
														);

														if (data?.success && data.data) {
															setConfirmDeleteOpen(false);
															setCategories(data.data);
														}
													}}
												>
													<IconTrash />
												</Button>
											</ButtonGroup>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						)}
					</InputGroupAddon>
				)}
			</InputGroup>
		</div>
	);
}
