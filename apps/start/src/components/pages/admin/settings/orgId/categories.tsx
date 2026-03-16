"use client";

import { useLayoutData } from "@/components/generic/Context";
import CreateCategory from "@/components/organization/create-category";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import type { schema } from "@repo/database";
import { useEffect } from "react";

export default function SettingsOrganizationCategoriesPage() {
	const { serverEvents } = useLayoutData();
	const { organization, setOrganization, categories, setCategories, setLabels, tasks } =
		useLayoutOrganizationSettings();
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
