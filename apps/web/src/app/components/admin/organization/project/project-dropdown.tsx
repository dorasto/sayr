"use client";

import type { schema } from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { TabbedDialog, TabbedDialogFooter, TabPanel } from "@repo/ui/components/tomui/tabbed-dialog";
import { IconSettings, IconTag } from "@tabler/icons-react";
import { Settings } from "lucide-react";
import { useState } from "react";
import CreateLabel from "@/app/components/globals/project/create-label";

interface Props {
	project: schema.projectType;
	setProject: (newValue: Props["project"]) => void;
	labels: schema.labelType[];
	setLabels: (newValue: Props["labels"]) => void;
}

export function ProjectDropdown({ project, setProject, labels, setLabels }: Props) {
	const [isOpen, setIsOpen] = useState(false);

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
			<Button onClick={() => setIsOpen(true)}>Project Settings</Button>

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
						<CreateLabel orgId={project.organizationId || ""} />
						{JSON.stringify(labels, null, 4)}
					</div>
				</TabPanel>
			</TabbedDialog>
		</div>
	);
}
