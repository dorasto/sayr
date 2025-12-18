"use client";

import { useLayoutData } from "@/components/generic/Context";
import CreateCategory from "@/components/organization/create-category";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import type { schema } from "@repo/database";
import { useEffect } from "react";

export default function SettingsOrganizationCategoriesPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, categories, setCategories, setLabels, tasks } =
		useLayoutOrganizationSettings();
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
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE SettingsOrganizationCategoriesPage]", msg),
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
