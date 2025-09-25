"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { TabbedDialog, TabPanel } from "@repo/ui/components/tomui/tabbed-dialog";
import { IconCircleFilled, IconSettings, IconTag } from "@tabler/icons-react";
import { useState } from "react";
import CreateLabel from "@/app/components/globals/project/create-label";

interface Props {
	project: schema.projectType;
	setProject: (newValue: Props["project"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: Props["labels"]) => void;
	isOpen?: boolean;
	setIsOpen?: (open: boolean) => void;
}

export default function ProjectDropdown({
	project,
	setProject,
	labels,
	setLabels,
	isOpen = false,
	setIsOpen = () => {
		false;
	},
}: Props) {
	// const [isOpen, setIsOpen] = useState(false);

	// Simple side layout with one tab
	const sideGroupedTabs = [
		{
			name: "Project Settings",
			items: [
				{
					id: "general",
					label: "General",
					icon: <IconSettings className="w-4 h-4" />,
					title: "General Settings",
					description: "Configure basic project information and preferences",
				},
				{
					id: "labels",
					label: "Labels",
					icon: <IconTag className="w-4 h-4" />,
					title: "Labels",
				},
			],
		},
	];

	return (
		<div>
			{/* <Button onClick={() => setIsOpen(true)}>Project Settings</Button> */}

			<TabbedDialog
				isOpen={isOpen}
				onOpenChange={setIsOpen}
				title="Project Configuration"
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
						<CreateLabel orgId={project.organizationId || ""} labels={labels} setLabels={setLabels} />
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
			</TabbedDialog>
		</div>
	);
}
