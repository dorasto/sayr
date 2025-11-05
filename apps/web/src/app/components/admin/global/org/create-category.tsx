"use client";
import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconCircleFilled, IconSearch, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { createCategoryAction } from "@/app/lib/fetches";
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
	const { runWithToast, isFetching } = useToastAction();

	const isEditMode = mode === "edit" && category;
	return (
		<div className="">
			<InputGroup className="h-auto bg-accent border-transparent">
				<InputGroupAddon align="inline-start">
					<InputGroupButton asChild>
						<Popover modal={true}>
							<PopoverTrigger asChild>
								<Button variant={"accent"} size={"icon"} className="aspect-square">
									<IconCircleFilled style={{ color: color.hsla || "" }} />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="p-0 w-64">
								<div className="flex flex-col gap-3">
									<div className="p-3">
										<ColorPickerCustom onChange={setColor} defaultValue={color.hex} height={100} />
									</div>
									<div className="">
										<div className="">
											<InputGroup>
												<InputGroupInput placeholder="Search..." />
												<InputGroupAddon>
													<IconSearch />
												</InputGroupAddon>
											</InputGroup>
											<div>
												... icons here in a scroll. The color chosen will become the icon color, and we'll
												generate a shade for the background/adjust the opacity.
											</div>
										</div>
									</div>
								</div>
							</PopoverContent>
						</Popover>
					</InputGroupButton>
				</InputGroupAddon>
				<InputGroupInput
					placeholder="Category name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					readOnly={!!isEditMode}
				/>
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
								}
							}}
							disabled={name.length === 0 || isFetching}
						>
							Save
						</InputGroupButton>
					</InputGroupAddon>
				) : (
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							variant="ghost"
							className="h-full"
							// onClick={async () => {
							// 	const data = await runWithToast(
							// 		"create-category",
							// 		{
							// 			loading: {
							// 				title: "Creating category...",
							// 				description: "Please wait while we create the category.",
							// 			},
							// 			success: {
							// 				title: "Category created",
							// 				description: "The category has been successfully created.",
							// 			},
							// 			error: {
							// 				title: "Failed to create category",
							// 				description: "An error occurred while creating the category.",
							// 			},
							// 		},
							// 		() =>
							// 			createCategoryAction(
							// 				orgId,
							// 				{
							// 					name,
							// 					color: color.hsla,
							// 				},
							// 				wsClientId
							// 			)
							// 	);
							// 	if (data?.success && data.data) {
							// 		setCategories([...categories, data.data]);
							// 		setName("");
							// 		setColor({
							// 			hsla: "#000000",
							// 			hex: "#000000",
							// 		});
							// 	}
							// }}
							// disabled={name.length === 0 || isFetching}
						>
							<IconTrash />
							{/* icon trash or render "Update" instead if there's changes to save instead. */}
						</InputGroupButton>
					</InputGroupAddon>
				)}
			</InputGroup>
		</div>
	);
}
