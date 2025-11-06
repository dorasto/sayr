"use client";

import type { schema } from "@repo/database";
import { TabbedDialog, TabPanel } from "@repo/ui/components/tomui/tabbed-dialog";
import { IconCategory, IconSettings, IconTag } from "@tabler/icons-react";
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
	tasks?: schema.TaskWithLabels[];
	onCategoryClick?: (categoryId: string) => void;
	onLabelClick?: (labelId: string) => void;
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
	tasks = [],
	onCategoryClick,
	onLabelClick,
}: Props) {
	// Calculate task count per category
	const getCategoryTaskCount = (categoryId: string) => {
		return tasks.filter((task) => task.category === categoryId).length;
	};
	const getLabelTaskCount = (labelId: string) => {
		return tasks.filter((task) => task.labels.find((e) => e.id === labelId))?.length;
	};
	// Simple side layout with one tab
	const sideGroupedTabs = [
		{
			name: organization?.name || "Organization",
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
					<div className="p-4 flex flex-col gap-2">
						<CreateLabel orgId={organization.id} setLabels={setLabels} />
						{labels.map((label) => (
							<CreateLabel
								key={label.id}
								orgId={organization.id}
								setLabels={setLabels}
								label={label}
								mode="edit"
								taskCount={getLabelTaskCount(label.id)}
								onLabelClick={onLabelClick}
							/>
						))}
					</div>
				</TabPanel>
				<TabPanel tabId="categories">
					<div className="p-4 flex flex-col gap-2">
						<CreateCategory orgId={organization.id} setCategories={setCategories} />
						{categories.map((category) => (
							<CreateCategory
								key={category.id}
								orgId={organization.id}
								setCategories={setCategories}
								category={category}
								mode="edit"
								taskCount={getCategoryTaskCount(category.id)}
								onCategoryClick={onCategoryClick}
							/>
						))}
					</div>
				</TabPanel>
			</TabbedDialog>
		</div>
	);
}
