"use client";

import { useLayoutData } from "@/components/generic/Context";
import CreateRelease from "@/components/organization/create-release";
import { useLayoutOrganizationSettings } from "@/contexts/ContextOrgSettings";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { WSMessage } from "@/lib/ws";
import type { schema } from "@repo/database";
import { useEffect } from "react";

export default function SettingsOrganizationReleasesPage() {
	const { ws } = useLayoutData();
	const { organization, setOrganization, setReleases, tasks, releases } = useLayoutOrganizationSettings();

	useWebSocketSubscription({
		ws,
		orgId: organization.id,
		organization: organization,
		channel: "admin",
		setOrganization: setOrganization,
	});

	const handlers: WSMessageHandler<WSMessage> = {
		UPDATE_RELEASES: (msg: WSMessage) => {
			if (msg.scope === "CHANNEL") {
				setReleases(msg.data);
			}
		},
		DELETE_RELEASE: (msg: WSMessage) => {
			if (msg.scope === "CHANNEL" && msg.data?.releaseId) {
				setReleases(releases.filter((r: schema.releaseType) => r.id !== msg.data.releaseId));
			}
		},
	};

	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		// onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE SettingsOrganizationReleasesPage]", msg),
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

	// Calculate task count per release
	const getReleaseTaskCount = (releaseId: string) => {
		return tasks.filter((task: schema.TaskWithLabels) => task.releaseId === releaseId).length;
	};

	// Group releases by status
	const groupedReleases = {
		planned: releases.filter((r) => r.status === "planned"),
		"in-progress": releases.filter((r) => r.status === "in-progress"),
		released: releases.filter((r) => r.status === "released"),
		archived: releases.filter((r) => r.status === "archived"),
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Create New Release */}
			<div className="bg-card rounded-lg flex flex-col">
				<CreateRelease orgId={organization.id} setReleases={setReleases} settingsUI={true} />
			</div>

			{/* Active Releases */}
			{(groupedReleases.planned.length > 0 || groupedReleases["in-progress"].length > 0) && (
				<div className="flex flex-col gap-3">
					<h3 className="text-sm font-medium text-muted-foreground">Active Releases</h3>
					<div className="bg-card rounded-lg flex flex-col">
						{groupedReleases.planned.map((release) => (
							<CreateRelease
								key={release.id}
								orgId={organization.id}
								setReleases={setReleases}
								release={release}
								mode="edit"
								taskCount={getReleaseTaskCount(release.id)}
								settingsUI={true}
							/>
						))}
						{groupedReleases["in-progress"].map((release) => (
							<CreateRelease
								key={release.id}
								orgId={organization.id}
								setReleases={setReleases}
								release={release}
								mode="edit"
								taskCount={getReleaseTaskCount(release.id)}
								settingsUI={true}
							/>
						))}
					</div>
				</div>
			)}

			{/* Released */}
			{groupedReleases.released.length > 0 && (
				<div className="flex flex-col gap-3">
					<h3 className="text-sm font-medium text-muted-foreground">Released</h3>
					<div className="bg-card rounded-lg flex flex-col">
						{groupedReleases.released.map((release) => (
							<CreateRelease
								key={release.id}
								orgId={organization.id}
								setReleases={setReleases}
								release={release}
								mode="edit"
								taskCount={getReleaseTaskCount(release.id)}
								settingsUI={true}
							/>
						))}
					</div>
				</div>
			)}

			{/* Archived */}
			{groupedReleases.archived.length > 0 && (
				<div className="flex flex-col gap-3">
					<h3 className="text-sm font-medium text-muted-foreground">Archived</h3>
					<div className="bg-card rounded-lg flex flex-col">
						{groupedReleases.archived.map((release) => (
							<CreateRelease
								key={release.id}
								orgId={organization.id}
								setReleases={setReleases}
								release={release}
								mode="edit"
								taskCount={getReleaseTaskCount(release.id)}
								settingsUI={true}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
