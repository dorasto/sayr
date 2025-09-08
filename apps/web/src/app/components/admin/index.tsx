"use client";
import { TabbedDialogExample } from "@repo/ui/components/tomui/tabbed-dialog-example";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useEffect, useState } from "react";
import { useLayoutData } from "@/app/admin/Context";
import type { WSMessage } from "@/app/lib/ws";

export default function AdminHomePage() {
	const { account, ws } = useLayoutData();
	const { value: wsStatus } = useStateManagement<string>("ws-status", "Disconnected");

	const [messages, setMessages] = useState<WSMessage[]>([]);
	const [subscribed, setSubscribed] = useState(false);

	useEffect(() => {
		if (!ws) return;

		const payload = {
			type: "SUBSCRIBE",
			orgId: "test",
			channel: "admin",
		};

		ws.send(JSON.stringify(payload));
		console.log("📡 Sent SUBSCRIBE:", payload);

		ws.onmessage = (event) => {
			const data = JSON.parse(event.data) as WSMessage;
			console.log("🚀 ~ AdminHomePage ~ data:", data);

			if (data.type === "SUBSCRIBED") {
				setSubscribed(true);
			} else {
				setMessages((prev) => [...prev, data]);
			}
			// if (data.type === "UPDATE_ORG") {
			// 	setOrg(data.data);
			// }
		};
	}, [ws]);
	return (
		<div className="">
			<TabbedDialogExample />
			{/* <h1>org detail {organization.name}</h1> */}
			{/** biome-ignore lint/performance/noImgElement: <will use> */}
			{/* <img src={organization.logo || ""} alt={organization.name} /> */}
			{/** biome-ignore lint/performance/noImgElement: <will use> */}
			{/* <img src={organization.bannerImg || ""} alt={organization.name} /> */}
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
			{subscribed ? (
				<div className="text-green-600 font-medium">
					✅ Subscribed to channel <code>admin</code>
				</div>
			) : (
				<div className="text-yellow-600">⏳ Waiting for subscription...</div>
			)}
			<div className="mt-4">
				<h2 className="text-lg font-semibold mb-2">📩 Incoming Messages</h2>
				{messages.length === 0 ? (
					<div className="text-gray-500 italic">No messages yet...</div>
				) : (
					<ul className="space-y-2">
						{messages.map((msg, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: <only for testing>
							<li key={i} className="p-3 border rounded bg-gray-500 shadow-sm text-sm">
								<div className="font-mono text-white">
									{msg.type === "MESSAGE" ? (
										<>
											<span className="font-bold">[{msg.meta?.channel || ""}]</span> {msg.data.text}
										</>
									) : (
										<pre>{JSON.stringify(msg, null, 2)}</pre>
									)}
								</div>
								{msg.type === "MESSAGE" && (
									<div className="text-xs text-gray-200 mt-1">
										{new Date(msg.meta?.ts || "").toLocaleTimeString()}
									</div>
								)}
								{msg.type === "FIREHOSE" && (
									<div className="text-xs text-gray-200 mt-1">
										{new Date(msg.meta?.ts || "").toLocaleTimeString()}
									</div>
								)}
								{msg.type === "PING" && (
									<div className="text-xs text-gray-200 mt-1">
										{new Date(msg.ts || "").toLocaleTimeString()}
									</div>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
			test
		</div>
	);
}
