"use client";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { TabbedDialogExample } from "@repo/ui/components/tomui/tabbed-dialog-example";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useLayoutData } from "@/app/admin/Context";
import { useWebSocketSubscription } from "@/app/hooks/useWebSocketSubscription";

export default function AdminHomePage() {
	const { account, ws } = useLayoutData();
	const { value: wsStatus } = useStateManagement<string>("ws-status", "Disconnected");
	const { wsSubscribedState } = useWebSocketSubscription({
		ws,
	});
	return (
		<div className="">
			<Button
				onClick={() =>
					headlessToast({
						title: "Testing",
					})
				}
			>
				Basic
			</Button>
			<Button
				onClick={() =>
					headlessToast.success({
						title: "Success",
					})
				}
			>
				Success
			</Button>
			<Button
				onClick={() =>
					headlessToast.error({
						title: "Error",

						description: "This is a warning",
						action: {
							label: "Retry",
							onClick: () => alert("Retrying..."),
						},
					})
				}
			>
				Error
			</Button>
			<Button
				onClick={() =>
					headlessToast.success({
						title: "Headless Success",
						description: "Fully custom JSX + Tailwind classes.",
						action: {
							label: "Close",
							onClick: () => console.log("Closed headless toast"),
						},
					})
				}
			>
				Headless Success
			</Button>
			<TabbedDialogExample />
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
