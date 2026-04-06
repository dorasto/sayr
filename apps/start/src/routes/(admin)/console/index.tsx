import UserTable from "@/components/console/user-table";
import OrgTable from "@/components/console/org-table";
import { SystemApiKeys } from "@/components/console/system-api-keys";
import { SubWrapper } from "@/components/generic/wrapper";
import { getConsoleUsersServer, getConsoleOrgsServer } from "@/lib/serverFunctions/getConsoleData";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { seo } from "@/seo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";

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
	head: () => ({ meta: seo({ title: "Console" }) }),
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
		// Initial load: fetch page 1 server-side via direct DB access
		const [usersResult, orgsResult] = await Promise.all([
			getConsoleUsersServer({ data: { page: 1, limit: 25 } }),
			getConsoleOrgsServer({ data: { page: 1, limit: 25 } }),
		]);
		return {
			users: usersResult.data ?? [],
			pagination: usersResult.pagination ?? {
				limit: 25,
				page: 1,
				totalPages: 1,
				totalItems: 0,
				hasMore: false,
			},
			orgs: orgsResult.data ?? [],
			orgsPagination: orgsResult.pagination ?? {
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
	const { users, pagination, orgs, orgsPagination } = Route.useLoaderData();
	const [activeTab, setActiveTab] = useState("users");

	return (
		<SubWrapper
			title="Console"
			description="Manage platform users and system settings"
			topContent={
				<div className="flex items-center gap-2">
					{isCloud && <SnapshotTriggerButton />}
				</div>
			}
		>
			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<TabsList>
					<TabsTrigger value="users">Users</TabsTrigger>
					<TabsTrigger value="organizations">Organizations</TabsTrigger>
					<TabsTrigger value="api-keys">System API Keys</TabsTrigger>
				</TabsList>
				<TabsContent value="users" className="mt-4">
					<UserTable initialData={{ users, pagination }} />
				</TabsContent>
				<TabsContent value="organizations" className="mt-4">
					<OrgTable initialData={{ orgs, pagination: orgsPagination }} />
				</TabsContent>
				<TabsContent value="api-keys" className="mt-4">
					<SystemApiKeys />
				</TabsContent>
			</Tabs>
		</SubWrapper>
	);
}

