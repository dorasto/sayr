import UserTable from "@/components/console/user-table";
import { SubWrapper } from "@/components/generic/wrapper";
import { getConsoleUsersServer } from "@/lib/serverFunctions/getConsoleData";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { seo } from "@/seo";

const isCloud = import.meta.env.VITE_SAYR_EDITION === "cloud";

function SnapshotTriggerButton() {
	const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

	const trigger = async () => {
		setState("loading");
		try {
	const base = import.meta.env.VITE_APP_ENV === "development" ? "/backend-api/internal" : "/api/internal";
		const res = await fetch(`${base}/v1/admin/snapshots/trigger`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({}),
			});
			const json = await res.json();
			setState(json.success ? "done" : "error");
		} catch {
			setState("error");
		}
		setTimeout(() => setState("idle"), 3000);
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={trigger}
			disabled={state === "loading"}
		>
			{state === "loading" && "Snapshotting..."}
			{state === "done" && "Snapshot saved!"}
			{state === "error" && "Failed — retry?"}
			{state === "idle" && "Trigger snapshot"}
		</Button>
	);
}

export const Route = createFileRoute("/(admin)/console/")({
	head: () => ({ meta: seo({ title: "Users · Console" }) }),
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		// Initial load: fetch page 1 server-side via direct DB access
		const result = await getConsoleUsersServer({ data: { page: 1, limit: 25 } });
		return {
			users: result.data ?? [],
			pagination: result.pagination ?? {
				limit: 25,
				page: 1,
				totalPages: 1,
				totalItems: 0,
				hasMore: false,
			},
		};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { account } = Route.useRouteContext();
	if (account?.role !== "admin") {
		throw redirect({ to: "/" });
	}
	const { users, pagination } = Route.useLoaderData();
	return (
		<SubWrapper
			title="Users"
			description={`${pagination.totalItems} users`}
			topContent={isCloud ? <SnapshotTriggerButton /> : undefined}
		>
			<UserTable initialData={{ users, pagination }} />
		</SubWrapper>
	);
}

