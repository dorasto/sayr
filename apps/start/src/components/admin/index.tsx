"use client";
import { Button } from "@repo/ui/components/button";
import { headlessToast } from "@repo/ui/components/headless-toast";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useWebSocketSubscription } from "@/hooks/useWebSocketSubscription";
import { useLayoutData } from "../generic/Context";
import * as Sentry from "@sentry/tanstackstart-react";
// import Editor from "../prosekit/editor";

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
				onClick={() => {
					// Send test metrics to Sentry
					if (import.meta.env.VITE_SENTRY_DSN) {
						Sentry.metrics.gauge("test_button_click", 1);
					}

					headlessToast.error({
						title: "Error",

						description: "This is a warning",
						action: {
							label: "Retry",
							onClick: () => alert("Retrying..."),
						},
					});
					throw new Error("Sentry Test Error");
				}}
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
			<Button
				onClick={() => {
					// Send test metrics to Sentry without throwing error
					if (import.meta.env.VITE_SENTRY_DSN) {
						Sentry.metrics.gauge("test_metric_gauge", 42);
						Sentry.metrics.distribution("test_metric_distribution", 150);

						headlessToast.success({
							title: "Metrics Sent",
							description: "Test metrics sent to Sentry successfully",
						});
					} else {
						headlessToast.error({
							title: "Sentry Not Configured",
							description: "VITE_SENTRY_DSN is not set",
						});
					}
				}}
			>
				Test Sentry Metrics
			</Button>
			<Button
				onClick={async () => {
					// Example: Measure performance of a slow operation
					if (import.meta.env.VITE_SENTRY_DSN) {
						await Sentry.startSpan(
							{
								name: "Slow Operation Test",
								op: "function.slow_calculation",
							},
							async () => {
								// Simulate slow calculation
								const start = performance.now();
								let result = 0;
								for (let i = 0; i < 10000000; i++) {
									result += Math.sqrt(i);
								}
								const duration = performance.now() - start;

								// Send metric for the duration
								Sentry.metrics.distribution("slow_operation_duration", duration);

								headlessToast.success({
									title: "Performance Tracked",
									description: `Operation took ${duration.toFixed(2)}ms`,
								});
							},
						);
					} else {
						headlessToast.error({
							title: "Sentry Not Configured",
							description: "VITE_SENTRY_DSN is not set",
						});
					}
				}}
			>
				Test Performance Tracking
			</Button>
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
			{/* <Editor readonly={false} /> */}
		</div>
	);
}
