"use client";

import { useLayoutData } from "@/components/generic/Context";
import CreateLabel from "@/components/organization/create-label";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import type { schema } from "@repo/database";
import { useEffect } from "react";

export default function SettingsOrganizationLabelsPage() {
	const { serverEvents } = useLayoutData();
	const { organization, setOrganization, setCategories, setLabels, tasks, labels } = useLayoutOrganizationSettings();
	console.log("🚀 ~ SettingsOrganizationLabelsPage ~ labels:", labels)
	useServerEventsSubscription({
		serverEvents,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<ServerEventMessage> = {
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
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers, {
	});
	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);
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
