import { db, getOrganizationPublic, getReleaseBySlug, schema } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { onWindowMessage } from "@repo/ui/hooks/useWindowMessaging.ts";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { useEffect, useState } from "react";
import { ReleaseDetailView } from "@/components/public/portal/releases/ReleaseDetailView";
import { ReleaseNotFound } from "@/components/public/portal/releases/ReleaseNotFound";
import { getReleaseStatusConfig } from "@/components/releases/config";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { useWSMessageHandler, type WSMessageHandler } from "@/hooks/useWSMessageHandler";
import type { ServerEventMessage } from "@/lib/serverEvents";
import { getOgImageUrl, seo } from "@/seo";

const fetchPublicRelease = createServerFn({ method: "GET" })
	.inputValidator((data: { orgSlug: string; releaseSlug: string }) => data)
	.handler(async ({ data }) => {
		// Resolve system org for single-tenant installs
		const { multiTenantEnabled } = getEditionCapabilities();
		let resolvedSlug = data.orgSlug;

		if (!multiTenantEnabled) {
			const systemOrg = await db.query.organization.findFirst({
				where: (o, { eq }) => eq(o.isSystemOrg, true),
				columns: { slug: true },
			});
			if (systemOrg?.slug) resolvedSlug = systemOrg.slug;
		}

		const org = await getOrganizationPublic(resolvedSlug);
		if (!org?.settings?.enablePublicPage) return { release: null, tasks: [], org: null };

		const release = await getReleaseBySlug(org.id, data.releaseSlug);
		if (!release) return { release: null, tasks: [], org: null };

		// Fetch only public tasks for this release
		const rawTasks = await db.query.task.findMany({
			where: and(eq(schema.task.releaseId, release.id), eq(schema.task.visible, "public")),
			with: {
				labels: { with: { label: true } },
				assignees: {
					with: {
						user: {
							columns: { id: true, name: true, image: true, createdAt: true },
						},
					},
				},
			},
			orderBy: (t, { asc }) => asc(t.createdAt),
		});

		const tasks = rawTasks.map((task) => ({
			...task,
			labels: task.labels.map((l) => l.label),
			assignees: task.assignees.map((a) => a.user),
		}));

		return {
			release,
			tasks,
			org: { id: org.id, name: org.name, logo: org.logo },
		};
	});

export const Route = createFileRoute("/orgs/$orgSlug/releases/$releaseSlug/")({
	loader: async ({ params, context }) =>
		fetchPublicRelease({
			data: {
				orgSlug: (context as { systemSlug?: string | null })?.systemSlug || params.orgSlug,
				releaseSlug: params.releaseSlug,
			},
		}),
	head: ({ loaderData }) => {
		// Build task status counts for OG stats pills
		const statsMap: Record<string, number> = {};
		for (const task of loaderData?.tasks ?? []) {
			if (task.status) {
				statsMap[task.status] = (statsMap[task.status] ?? 0) + 1;
			}
		}
		const stats = Object.entries(statsMap).map(([status, count]) => ({
			status,
			count,
		}));

		return {
			meta: seo({
				title: loaderData?.release?.name ?? "Release",
				image: loaderData?.release
					? getOgImageUrl({
							title: loaderData.release.name,
							subtitle: loaderData.release.status
								? getReleaseStatusConfig(loaderData.release.status).label
								: undefined,
							meta: loaderData.org?.name || undefined,
							logo: loaderData.org?.logo || undefined,
							stats: stats.length > 0 ? stats : undefined,
						})
					: undefined,
			}),
		};
	},
	component: ReleaseDetailPage,
});

function ReleaseDetailPage() {
	const { release, tasks, org } = Route.useLoaderData();
	const params = Route.useParams();
	const orgSlug = params.orgSlug;
	const router = useRouter();
	const { serverEvents, organization } = usePublicOrganizationLayout();
	const [statusUpdatesRefreshKey, setStatusUpdatesRefreshKey] = useState(0);

	// SSE handlers for real-time release updates
	const handlers: WSMessageHandler<ServerEventMessage> = {
		UPDATE_RELEASES: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
				router.invalidate();
			}
		},
		UPDATE_TASK: (msg) => {
			if (msg.scope === "PUBLIC" && msg.meta?.orgId === organization.id) {
				router.invalidate();
			}
		},
		UPDATE_RELEASE_STATUS_UPDATES: (msg) => {
			if (
				msg.scope === "PUBLIC" &&
				msg.meta?.orgId === organization.id &&
				(msg.data as { releaseId?: string })?.releaseId === release?.id
			) {
				setStatusUpdatesRefreshKey((k) => k + 1);
			}
		},
	};
	const handleMessage = useWSMessageHandler<ServerEventMessage>(handlers);

	// Attach SSE listener
	useEffect(() => {
		if (!serverEvents.event) return;
		serverEvents.event.addEventListener("message", handleMessage);
		return () => {
			serverEvents.event?.removeEventListener("message", handleMessage);
		};
	}, [serverEvents.event, handleMessage]);

	// Handle SSE reconnection — refetch all data
	useEffect(() => {
		const unsubscribe = onWindowMessage<{ type: string }>("*", (msg) => {
			if (msg.type === "SSE_RECONNECTED") {
				router.invalidate();
			}
		});
		return unsubscribe;
	}, [router]);

	// `release` can flip falsy on a mounted instance (every SSE handler above invalidates the loader, which returns a
	// null release if it was deleted or the org turned its public page off). Everything with hooks that depend on a
	// release lives in `ReleaseDetailView`, so this early return never changes a hook count.
	if (!release) return <ReleaseNotFound orgSlug={orgSlug} />;

	return (
		<ReleaseDetailView
			release={release}
			tasks={tasks}
			orgId={org?.id ?? ""}
			orgSlug={orgSlug}
			statusUpdatesRefreshKey={statusUpdatesRefreshKey}
		/>
	);
}
