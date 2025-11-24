"use client";

import type { schema } from "@repo/database";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import CreateCategory from "../../global/org/create-category";

export default function SettingsOrganizationCategoriesPage() {
	const { ws } = useLayoutData();
	const { organization, categories, setCategories, tasks } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
	});
	// Calculate task count per category
	const getCategoryTaskCount = (categoryId: string) => {
		return tasks.filter((task: schema.TaskWithLabels) => task.category === categoryId).length;
	};
	return (
		<div className="bg-card rounded-lg flex flex-col">
			<CreateCategory orgId={organization.id} setCategories={setCategories} settingsUI={true} />
			{categories.map((category) => (
				<CreateCategory
					key={category.id}
					orgId={organization.id}
					setCategories={setCategories}
					category={category}
					mode="edit"
					taskCount={getCategoryTaskCount(category.id)}
					settingsUI={true}
				/>
			))}
		</div>
	);
}
