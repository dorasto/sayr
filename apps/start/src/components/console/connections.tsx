"use client";
import { useState, useEffect } from "react";
import { ConnectionsSnapshotTable } from "./ConnectionsSnapshotTable";
import { Button } from "@repo/ui/components/button";
import { IconCircleFilled } from "@tabler/icons-react";
import RenderIcon from "../generic/RenderIcon";

export type ConnectionType = {
	sseClientId: string;
	clientId: string;
	orgId: string;
	channel: string;
	connectedAt: number;
	authenticated: boolean;
	account?: {
		name: string;
		image: string;
		role: string;
	};
	device: string;
	ref?: string;
};

export type IntegrationType = {
	id: string;
	name: string;
	description: string;
	version: string;
	icon?: string;
	enabled?: boolean;
	enabledOrgCount?: number;
	author?: {
		name: string;
		url?: string;
	}
};

const INTERNAL_API_URL =
	import.meta.env.VITE_APP_ENV === "development"
		? "/backend-api/internal"
		: "/api/internal";

export default function AdminConnectionsPage() {
	const [snapshot, setSnapshot] = useState<ConnectionType[]>([]);
	const [integrations, setIntegrations] = useState<IntegrationType[]>([]);
	const [refreshIn, setRefreshIn] = useState(60);
	const refreshInterval = 60; // seconds

	async function getConnections() {
		try {
			const response = await fetch(`${INTERNAL_API_URL.replace("/internal", "")}/events/connections`, {
				method: "GET",
				credentials: "include"
			});

			if (!response.ok) {
				const error =
					(await response.json().catch(() => null)) || {
						error: "Failed to fetch connections"
					};
				throw new Error(error.error || "Failed to fetch connections");
			}

			const result = await response.json();
			return { success: true, data: result.data as ConnectionType[] };
		} catch (error) {
			console.error("getConnections error:", error);
			return {
				success: false,
				data: [] as ConnectionType[],
				error: (error as Error).message
			};
		}
	}

	async function getIntegrations() {
		try {
			const response = await fetch(`${INTERNAL_API_URL}/v1/admin/integrations/all`, {
				method: "GET",
				credentials: "include"
			});

			if (!response.ok) {
				throw new Error("Failed to fetch integrations");
			}

			const result = await response.json();
			return { success: true, data: result.data as IntegrationType[] };
		} catch (error) {
			console.error("getIntegrations error:", error);
			return { success: false, data: [] as IntegrationType[] };
		}
	}

	// Load immediately on first render
	const refreshNow = () => {
		getConnections().then(res => {
			if (res.success) setSnapshot(res.data);
		});
		getIntegrations().then(res => {
			if (res.success) setIntegrations(res.data);
		});
		setRefreshIn(refreshInterval);
	};

	useEffect(() => {
		refreshNow();
	}, []);

	// Countdown + auto-refresh every 60s
	useEffect(() => {
		const id = setInterval(() => {
			setRefreshIn(prev => {
				if (prev <= 1) {
					refreshNow();
					return refreshInterval;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(id);
	}, []);

	return (
		<div className="space-y-4">
			{integrations.length > 0 && (
				<div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
					<span className="text-sm font-medium">Integrations:</span>
					<div className="flex items-center gap-3">
						{integrations.map(integration => {
							const hasEnabledOrgs = (integration.enabledOrgCount ?? 0) > 0;
							return (
								<div
									key={integration.id}
									className="flex items-center gap-1.5 text-sm"
								>
									{integration.icon && <RenderIcon iconName={integration.icon} size={16} raw />}
									<span>{integration.name}</span>
									{hasEnabledOrgs ? (
										<IconCircleFilled className="text-success" size={10} />
									) : (
										<IconCircleFilled className="text-muted-foreground/50" size={10} />
									)}
									{(integration.enabledOrgCount ?? 0) > 0 && (
										<span className="text-xs text-muted-foreground">
											({integration.enabledOrgCount} org{(integration.enabledOrgCount ?? 0) !== 1 ? "s" : ""})
										</span>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}
			<div className="flex items-center justify-end">
				<div className="flex items-center gap-3">
					<span className="text-sm text-muted-foreground">
						Refreshing in {refreshIn}s
					</span>

					<Button
						variant="outline"
						size="sm"
						onClick={refreshNow}
					>
						Refresh now
					</Button>
				</div>
			</div>
			<ConnectionsSnapshotTable snapshot={snapshot} integrations={integrations} />
		</div>
	);
}