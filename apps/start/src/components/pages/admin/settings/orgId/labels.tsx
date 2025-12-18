"use client";

import { useLayoutData } from "@/components/generic/Context";
import CreateLabel from "@/components/organization/create-label";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import type { schema } from "@repo/database";
import { useEffect } from "react";

export default function SettingsOrganizationLabelsPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, setCategories, setLabels, tasks, labels } = useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_LABELS: (msg) => {
			if (msg.scope === "CHANNEL") {
				setLabels(msg.data);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "CHANNEL") {
				setCategories(msg.data);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE SettingsOrganizationLabelsPage]", msg),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		// Cleanup on unmount or dependency change
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);
	if (!organization) {
		return null;
	}
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
