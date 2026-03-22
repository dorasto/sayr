import { getOrganizationPublic, getReleaseBySlug } from "@repo/database";
import { getEditionCapabilities } from "@repo/edition";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getReleaseStatusConfig } from "@/components/releases/config";
import { statusConfig } from "@/components/tasks/shared/config";
import { db, schema } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { SubWrapper, PanelWrapper } from "@/components/generic/wrapper";
import Editor from "@/components/prosekit/editor";
import type { NodeJSON } from "prosekit/core";
import { getOgImageUrl, seo } from "@/seo";
import {
	IconArrowLeft,
	IconLayoutSidebarRight,
	IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";

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
			where: and(
				eq(schema.task.releaseId, release.id),
				eq(schema.task.visible, "public"),
			),
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

		return { release, tasks, org: { name: org.name, logo: org.logo } };
	});

export const Route = createFileRoute("/orgs/$orgSlug/releases/$releaseSlug/")({
	loader: async ({ params, context }) =>
		fetchPublicRelease({
			data: {
				orgSlug:
					(context as { systemSlug?: string | null })?.systemSlug ||
					params.orgSlug,
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
		const stats = Object.entries(statsMap).map(([status, count]) => ({ status, count }));

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

function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "";
	const d = date instanceof Date ? date : new Date(date);
	return d.toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

type PublicTask = schema.taskType & {
	labels: schema.labelType[];
	assignees: Array<{
		id: string;
		name: string;
		image: string | null;
		createdAt: Date;
	}>;
};

const TASK_STATUS_ORDER = [
	"backlog",
	"todo",
	"in-progress",
	"done",
	"canceled",
] as const;

function ReleaseDetailPage() {
	const { release, tasks } = Route.useLoaderData();
	const params = Route.useParams();
	const orgSlug = params.orgSlug;
	const [panelOpen, setPanelOpen] = useState(true);

	if (!release) {
		return (
			<SubWrapper
				backButton={`/orgs/${orgSlug}/releases`}
				backButtonText="Releases"
			>
				<p className="text-muted-foreground">Release not found.</p>
			</SubWrapper>
		);
	}

	const cfg = getReleaseStatusConfig(release.status);

	// Group tasks by status
	const grouped = TASK_STATUS_ORDER.map((status) => ({
		status,
		tasks: tasks.filter((t) => t.status === status),
	})).filter((g) => g.tasks.length > 0);

	return (
		<div className="flex flex-col h-full">
			{/* Top bar */}
			<div className="flex items-center justify-between h-11 shrink-0 border-b px-3">
				<Link to={`/orgs/${orgSlug}/releases`}>
					<Button
						variant="ghost"
						className="w-fit text-xs p-1 h-auto rounded-lg"
						size="sm"
					>
						<IconArrowLeft className="size-3!" />
						Releases
					</Button>
				</Link>
				<Button
					variant="accent"
					className={cn(
						"gap-2 h-6 w-fit bg-accent border-transparent p-1",
						!panelOpen && "bg-transparent",
					)}
					onClick={() => setPanelOpen((v) => !v)}
				>
					{panelOpen ? (
						<IconLayoutSidebarRightFilled className="w-3 h-3" />
					) : (
						<IconLayoutSidebarRight className="w-3 h-3" />
					)}
				</Button>
			</div>

			{/* Split pane */}
			<div className="flex-1 min-h-0">
				<PanelWrapper
					isOpen={panelOpen}
					setOpen={setPanelOpen}
					panelDefaultSize={28}
					panelMinSize={20}
					panelHeader={
						<div className="flex items-center gap-2">
							<Label className="text-sm font-semibold">Tasks in this Release</Label>
							<Badge variant="secondary" className="text-xs">
								{tasks.length}
							</Badge>
						</div>
					}
					panelBody={
						tasks.length === 0 ? (
							<p className="text-sm text-muted-foreground px-1 py-4 text-center">
								No public tasks in this release.
							</p>
						) : (
							<div className="flex flex-col gap-4">
								{grouped.map(({ status, tasks: groupTasks }) => {
									const sc = statusConfig[status as keyof typeof statusConfig];
									return (
										<div key={status} className="flex flex-col gap-1">
											<div className="flex items-center gap-1.5 px-1 mb-1">
												<span className="text-muted-foreground">
													{sc?.icon?.("h-3.5 w-3.5")}
												</span>
												<span className="text-xs font-semibold text-muted-foreground">
													{sc?.label ?? status}
												</span>
												<span className="text-xs text-muted-foreground ml-auto">
													{groupTasks.length}
												</span>
											</div>
											{groupTasks.map((task) => (
												<TaskRow
													key={task.id}
													task={task}
													orgSlug={orgSlug}
												/>
											))}
										</div>
									);
								})}
							</div>
						)
					}
					className="h-full"
				>
					{/* Left: scrollable content */}
					<div className="h-full overflow-y-auto">
						<div className="flex flex-col gap-6 p-6">
							{/* Title + meta */}
							<div className="flex flex-col gap-2">
								<Badge
									variant="outline"
									className={cn("w-fit text-xs", cfg?.badgeClassName)}
								>
									{cfg?.label}
								</Badge>
								<h1 className="text-4xl font-bold tracking-tight">{release.name}</h1>
								<div className="flex items-center gap-3 flex-wrap">
									{release.targetDate && release.status !== "released" && (
										<span className="text-sm text-muted-foreground">
											Target: {formatDate(release.targetDate)}
										</span>
									)}
									{release.releasedAt && (
										<span className="text-sm text-muted-foreground">
											Released: {formatDate(release.releasedAt)}
										</span>
									)}
								</div>
							</div>

							{/* Description */}
							{release.description && (
								<Editor
									readonly
									defaultContent={release.description as NodeJSON}
									hideBlockHandle
								/>
							)}
						</div>
					</div>
				</PanelWrapper>
			</div>
		</div>
	);
}

function TaskRow({ task, orgSlug }: { task: PublicTask; orgSlug: string }) {
	const sc = statusConfig[task.status as keyof typeof statusConfig];

	return (
		<Link
			to={`/orgs/${orgSlug}/${task.shortId}`}
			className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 hover:bg-accent/50 transition-colors group"
		>
			{sc?.icon && (
				<span className="shrink-0 text-muted-foreground">
					{sc.icon("h-4 w-4")}
				</span>
			)}
			<span className="flex-1 min-w-0 text-sm font-medium truncate group-hover:text-foreground">
				{task.title}
			</span>
			<span className="shrink-0 text-xs text-muted-foreground">
				#{task.shortId}
			</span>
		</Link>
	);
}
