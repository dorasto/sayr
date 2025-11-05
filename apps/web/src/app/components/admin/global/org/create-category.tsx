"use client";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import IconPicker from "@/app/components/icon-picker";
import RenderIcon from "@/app/components/RenderIcon";
import { createCategoryAction, deleteCategoryAction, editCategoryAction } from "@/app/lib/fetches";
import { useToastAction } from "@/app/lib/util";

interface Props {
	orgId: string;
	categories: schema.categoryType[];
	setCategories: (newValue: Props["categories"]) => void;
	category?: schema.categoryType;
	mode?: "create" | "edit";
	taskCount?: number;
	onCategoryClick?: (categoryId: string) => void;
}

export default function CreateCategory({
	orgId,
	categories,
	setCategories,
	category,
	mode = "create",
	taskCount = 0,
	onCategoryClick,
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

	return (
		<div className="">
			<InputGroup className="h-auto bg-accent border-transparent">
				<InputGroupAddon align="inline-start">
					<InputGroupButton asChild>
						<Popover modal>
							<PopoverTrigger asChild>
								<Button variant={"accent"} size={"icon"} className="aspect-square">
									<RenderIcon iconName={icon} color={color.hsla} raw />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="p-0 w-64">
								<div className="flex flex-col gap-3">
									<div className="p-3">
										<ColorPickerCustom onChange={setColor} defaultValue={color.hex} height={100} />
									</div>
									<div>
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

				<InputGroupInput placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />

				{isEditMode && (
					<InputGroupAddon align="inline-end">
						<Button
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
						</Button>
					</InputGroupAddon>
				)}

				{/* ------- Create Mode ------- */}
				{!isEditMode ? (
					<InputGroupAddon align="inline-end">
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
									setCategories([...categories, data.data]);
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
										setCategories(
											categories.map((cat) => (cat.id === data.data.id ? { ...cat, ...data.data } : cat))
										);
										setName(data.data.name);
										setColor({
											hsla: data.data.color || "#000000",
											hex: data.data.color || "#000000",
										});
										setIcon(data.data.icon || "IconCircleFilled");
									}
								}}
								disabled={isFetching}
							>
								<IconDeviceFloppy />
							</InputGroupButton>
						) : (
							<Popover open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
								<PopoverTrigger asChild>
									<InputGroupButton variant="ghost" className="h-full">
										<IconTrash />
									</InputGroupButton>
								</PopoverTrigger>
								<PopoverContent className="p-4 w-60 flex flex-col gap-3 bg-card border border-muted shadow-md">
									<p className="text-sm text-muted-foreground">
										Are you sure you want to delete this category?
									</p>
									<div className="flex justify-end gap-2">
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
													setCategories(categories.filter((cat) => cat.id !== category?.id));
												}
											}}
										>
											Delete
										</Button>
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
