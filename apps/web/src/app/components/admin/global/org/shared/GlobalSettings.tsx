"use client";

import type { schema } from "@repo/database";
import { Input } from "@repo/ui/components/input";
import { TabbedDialog, TabPanel } from "@repo/ui/components/tomui/tabbed-dialog";
import { IconCategory, IconCircleFilled, IconSettings, IconTag } from "@tabler/icons-react";
import CreateCategory from "../create-category";
import CreateLabel from "../create-label";

interface Props {
	organization: schema.OrganizationWithMembers;
	labels: schema.labelType[];
	setLabels: (newValue: Props["labels"]) => void;
	isOpen?: boolean;
	setIsOpen?: (open: boolean) => void;
	categories: schema.categoryType[];
	setCategories: (newValue: Props["categories"]) => void;
}

export default function GlobalSettings({
	organization,
	labels,
	setLabels,
	isOpen = false,
	setIsOpen = () => {
		false;
	},
	categories,
	setCategories,
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
					<CreateCategory orgId={organization.id} categories={categories} setCategories={setCategories} />
					{categories.map((category) => (
						<div key={category.id} className="flex items-center gap-3 bg-accent border rounded p-1">
							<div>
								<IconCircleFilled style={{ color: category.color || "" }} />
							</div>
							<Input
								variant={"ghost"}
								placeholder="Category name"
								className="bg-transparent"
								value={category.name}
								readOnly
							/>
						</div>
					))}
				</TabPanel>
			</TabbedDialog>
		</div>
	);
}
