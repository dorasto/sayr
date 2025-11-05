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
	tasks?: schema.TaskWithLabels[];
	onCategoryClick?: (categoryId: string) => void;
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
}: Props) {
	// Calculate task count per category
	const getCategoryTaskCount = (categoryId: string) => {
		return tasks.filter((task) => task.category === categoryId).length;
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
					<div className="p-4 flex flex-col gap-2">
						<CreateCategory orgId={organization.id} categories={categories} setCategories={setCategories} />
						{categories.map((category) => (
							<CreateCategory
								key={category.id}
								orgId={organization.id}
								categories={categories}
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
