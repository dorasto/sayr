"use client";
import { TabbedDialogExample } from "@repo/ui/components/tomui/tabbed-dialog-example";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect } from "react";
import { useLayoutOrganization } from "@/app/admin/[organization_id]/Context";
import { useLayoutData } from "@/app/admin/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";
import { useWSMessageHandler, type WSMessageHandler } from "@/app/hooks/useWSMessageHandler";
import type { WSMessage } from "@/app/lib/ws";

export default function OrganizationHomePage() {
	const { account, ws } = useLayoutData();
	const { value: wsStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { organization, setOrganization, setLabels, setViews, setCategories } = useLayoutOrganization();
	const { wsSubscribedState } = useWebSocketSubscription({
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
		UPDATE_VIEWS: (msg) => {
			if (msg.scope === "CHANNEL") {
				setViews(msg.data);
			}
		},
		UPDATE_CATEGORIES: (msg) => {
			if (msg.scope === "CHANNEL") {
				setCategories(msg.data);
			}
		},
	};
	const handleMessage = useWSMessageHandler<WSMessage>(handlers, {
		onUnhandled: (msg) => console.warn("⚠️ [UNHANDLED MESSAGE ORG PAGE]", msg),
	});
	useEffect(() => {
		if (!ws) return;
		ws.addEventListener("message", handleMessage);
		// Cleanup on unmount or dependency change
		return () => {
			ws.removeEventListener("message", handleMessage);
		};
	}, [ws, handleMessage]);
	return (
		<div className="">
			<TabbedDialogExample />
			<h1>org detail {organization.name}</h1>
			{/** biome-ignore lint/performance/noImgElement: <will use> */}
			<img src={organization.logo || ""} alt={organization.name} />
			{/** biome-ignore lint/performance/noImgElement: <will use> */}
			<img src={organization.bannerImg || ""} alt={organization.name} />
			<h1 className="text-2xl font-bold">👋 Welcome, {account.name}</h1>
			<div className="flex items-center gap-2">
				<span className="font-medium">WebSocket Status:</span>
				<span
					className={`px-2 py-1 rounded text-sm ${
						wsStatus === "Connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
					}`}
				>
					{wsStatus}
				</span>
			</div>
			{wsSubscribedState ? (
				<div className="text-green-600 font-medium">
					✅ Subscribed to channel <code>{wsSubscribedState.channel}</code>
				</div>
			) : (
				<div className="text-yellow-600">⏳ Waiting for subscription...</div>
			)}
		</div>
	);
}
