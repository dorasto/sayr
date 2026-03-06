"use client";

import { useLayoutData } from "@/components/generic/Context";
import { PlanLimitBanner } from "@/components/generic/PlanLimitBanner";
import CreateIssueTemplate from "@/components/organization/create-issue-template";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { usePlanLimitsFromData } from "@/hooks/usePlanLimits";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import { useEffect } from "react";

export default function SettingsOrganizationTemplatesPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, setIssueTemplates, issueTemplates, labels, categories, releases, views } =
		useLayoutOrganizationSettings();

	const { canCreateResource, isOverLimit, getLimitMessage } = usePlanLimitsFromData({
		plan: organization.plan,
		memberCount: organization.members.length,
		viewCount: views.length,
		issueTemplateCount: issueTemplates.length,
		releaseCount: releases.length,
	});
	const canCreateTemplate = canCreateResource("issueTemplates");
	const templatesOverLimit = isOverLimit("issueTemplates");
	const templateLimitMessage = getLimitMessage("issueTemplates");

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
		<div className="flex flex-col gap-2">
			{templatesOverLimit && (
				<PlanLimitBanner title="Template limit exceeded" description={templateLimitMessage} />
			)}
			<CreateIssueTemplate
				orgId={organization.id}
				setIssueTemplates={setIssueTemplates}
				availableLabels={labels}
				availableCategories={categories}
				availableUsers={organization.members.map((m) => m.user)}
				releases={releases}
				disabled={!canCreateTemplate}
				disabledMessage={templateLimitMessage}
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
					releases={releases}
					mode="edit"
					disabled={templatesOverLimit}
					disabledMessage={templateLimitMessage}
				/>
			))}
		</div>
	);
}
