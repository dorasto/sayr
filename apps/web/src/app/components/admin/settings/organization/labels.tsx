"use client";

import type { schema } from "@repo/database";
import { useLayoutData } from "@/app/admin/Context";
import { useLayoutOrganizationSettings } from "@/app/admin/settings/org/[org_id]/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import CreateLabel from "../../global/org/create-label";

export default function SettingsOrganizationLabelsPage() {
	const { ws } = useLayoutData();
	const { organization, labels, setLabels, tasks } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
	});
	// Calculate task count per label
	const getLabelTaskCount = (labelId: string) => {
		return tasks.filter((task: schema.TaskWithLabels) => task.labels.find((e) => e.id === labelId))?.length;
	};
	return (
		<div className="bg-card rounded-lg flex flex-col">
			<CreateLabel orgId={organization.id} setLabels={setLabels} settingsUI={true} />
			{labels.map((label) => (
				<CreateLabel
					key={label.id}
					orgId={organization.id}
					setLabels={setLabels}
					label={label}
					mode="edit"
					taskCount={getLabelTaskCount(label.id)}
					settingsUI={true}
				/>
			))}
		</div>
	);
}
