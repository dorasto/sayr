"use client";

import { useLayoutData } from "@/components/generic/Context";
import { PlanLimitBanner } from "@/components/generic/PlanLimitBanner";
import CreateIssueTemplate from "@/components/organization/create-issue-template";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { usePlanLimitsFromData } from "@/hooks/usePlanLimits";
import { useServerEventsSubscription } from "@/hooks/useServerEventsSubscription";
import { useWSMessageHandler, WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { useEffect } from "react";

export default function SettingsOrganizationTemplatesPage() {
	const { serverEvents } = useLayoutData();
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

	useServerEventsSubscription({
		serverEvents,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});
	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_ISSUE_TEMPLATES: (msg) => {
			if (msg.scope === "CHANNEL") {
				setIssueTemplates(msg.data);
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
