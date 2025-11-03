"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@repo/ui/components/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { Separator } from "@repo/ui/components/separator";
import ColorPicker from "@repo/ui/components/tomui/color-picker";
import ColorPickerCustom from "@repo/ui/components/tomui/color-picker-custom";
import { TabbedDialog, TabPanel } from "@repo/ui/components/tomui/tabbed-dialog";
import { IconCategory, IconCircleFilled, IconSearch, IconSettings, IconTag } from "@tabler/icons-react";
import { useState } from "react";
import CreateLabel from "../tasks/create-label";
import label from "../tasks/task/label";

interface Props {
	organization: schema.OrganizationWithMembers;
	labels: schema.labelType[];
	setLabels: (newValue: Props["labels"]) => void;
	isOpen?: boolean;
	setIsOpen?: (open: boolean) => void;
}

export default function GlobalSettings({
	organization,
	labels,
	setLabels,
	isOpen = false,
	setIsOpen = () => {
		false;
	},
}: Props) {
	// Simple side layout with one tab
	const sideGroupedTabs = [
		{
			name: "Organization Settings",
			items: [
				{
					id: "general",
					label: "General",
					icon: <IconSettings className="w-4 h-4" />,
					title: "General Settings",
				},
				{
					id: "labels",
					label: "Labels",
					icon: <IconTag className="w-4 h-4" />,
					title: "Labels",
				},
				{
					id: "categories",
					label: "Categories",
					icon: <IconCategory className="w-4 h-4" />,
					title: "Categories",
				},
			],
		},
	];
	const [color, setColor] = useState({
		hsla: "#000000",
		hex: "#000000",
	});
	return (
		<div>
			<TabbedDialog
				isOpen={isOpen}
				onOpenChange={setIsOpen}
				title="Organization Configuration"
				groupedTabs={sideGroupedTabs}
				defaultTab="general"
				layout="side"
				size="lg"
			>
				<TabPanel tabId="general">
					<div className="p-4"></div>
				</TabPanel>
				<TabPanel tabId="labels">
					<div className="p-4">
						<CreateLabel orgId={organization.id} labels={labels} setLabels={setLabels} />
						{labels.map((label) => (
							<div key={label.id} className="flex items-center gap-3 bg-accent border rounded p-1">
								<div>
									<IconCircleFilled style={{ color: label.color || "" }} />
								</div>
								<Input
									variant={"ghost"}
									placeholder="Label name"
									className="bg-transparent"
									value={label.name}
									readOnly
								/>
							</div>
						))}
					</div>
				</TabPanel>
				<TabPanel tabId="categories">
					<div className="p-4 flex flex-col gap-3">
						<InputGroup className="h-auto">
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
															... icons here in a scroll. The color chosen will become the icon color,
															and we'll generate a shade for the background/adjust the opacity.
														</div>
													</div>
												</div>
											</div>
										</PopoverContent>
									</Popover>
								</InputGroupButton>
							</InputGroupAddon>
							<InputGroupInput placeholder="Category name" />
							<InputGroupAddon align="inline-end">
								<InputGroupButton variant="ghost" className="h-full">
									Save
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						{/* map saved categories. Only show save when changes are made. Mapped items should look and act similar*/}
					</div>
				</TabPanel>
			</TabbedDialog>
		</div>
	);
}
