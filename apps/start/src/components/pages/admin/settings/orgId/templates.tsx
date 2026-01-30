"use client";

import { useLayoutData } from "@/components/generic/Context";
import CreateIssueTemplate from "@/components/organization/create-issue-template";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { useEffect } from "react";
import { Accordion } from "@repo/ui/components/accordion";

export default function SettingsOrganizationTemplatesPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, setIssueTemplates, issueTemplates, labels, categories } =
		useLayoutOrganizationSettings();
	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_ISSUE_TEMPLATES: (msg) => {
			if (msg.scope === "CHANNEL") {
				setIssueTemplates(msg.data);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		// onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE SettingsOrganizationTemplatesPage]", msg),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);
	if (!organization) {
		return null;
	}
	return (
		<div className="flex flex-col">
			<Accordion type="single" collapsible className="space-y-3">
				<CreateIssueTemplate
					orgId={organization.id}
					setIssueTemplates={setIssueTemplates}
					availableLabels={labels}
					availableCategories={categories}
					availableUsers={organization.members.map((m) => m.user)}
					settingsUI={true}
				/>
				{issueTemplates.map((template) => (
					<CreateIssueTemplate
						key={template.id}
						orgId={organization.id}
						setIssueTemplates={setIssueTemplates}
						template={template}
						availableLabels={labels}
						availableCategories={categories}
						availableUsers={organization.members.map((m) => m.user)}
						mode="edit"
						settingsUI={true}
					/>
				))}
			</Accordion>
		</div>
	);
}
