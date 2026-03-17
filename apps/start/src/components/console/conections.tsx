"use client";
import { useState, useEffect } from "react";
import { ConnectionsSnapshotTable } from "./ConnectionsSnapshotTable";
import { Button } from "@repo/ui/components/button";

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
	ref?: string;
};

const API_URL =
	import.meta.env.VITE_APP_ENV === "development"
		? "/backend-api"
		: "/api";

export default function AdminConnectionsPage() {
	const [snapshot, setSnapshot] = useState<ConnectionType[]>([]);
	const [refreshIn, setRefreshIn] = useState(60);
	const refreshInterval = 60; // seconds

	async function getConnections() {
		try {
			const response = await fetch(`${API_URL}/events/connections`, {
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

	// Load immediately on first render
	const refreshNow = () => {
		getConnections().then(res => {
			if (res.success) setSnapshot(res.data);
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
			<ConnectionsSnapshotTable snapshot={snapshot} />
		</div>
	);
}