import SettingsOrganizationViewDetailPage from "@/components/pages/admin/settings/orgId/view-detail";
import { SubWrapper } from "@/components/generic/wrapper";
import { db, schema } from "@repo/database";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { seo } from "@/seo";

const fetchView = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string; viewId: string }) => data)
	.handler(async ({ data }) => {
		const views = await db
			.select()
			.from(schema.savedView)
			.where(and(eq(schema.savedView.id, data.viewId), eq(schema.savedView.organizationId, data.orgId)))
			.limit(1);
		const view = views[0];
		return { view };
	});

export const Route = createFileRoute("/(admin)/settings/org/$orgId/views/$viewId/")({
	loader: async ({ params }) => {
		return await fetchView({
			data: {
				orgId: params.orgId,
				viewId: params.viewId,
			},
		});
	},
	head: ({ loaderData }) => ({
		meta: seo({
			title: loaderData?.view?.name ? `${loaderData.view.name} · Views · Settings` : "Views · Settings",
		}),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { view } = Route.useLoaderData();

	return (
		<SubWrapper title="Edit View" description="Manage settings for this saved view." style="compact">
			<SettingsOrganizationViewDetailPage viewId={view?.id as string} initialView={view} />
		</SubWrapper>
	);
}
