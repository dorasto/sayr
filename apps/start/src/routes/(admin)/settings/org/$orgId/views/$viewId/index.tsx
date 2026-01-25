import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationViewDetailPage from "@/components/pages/admin/settings/orgId/view-detail";
import { db, schema } from "@repo/database";
import { IconStack2 } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";

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
	component: RouteComponent,
});

function RouteComponent() {
	const { orgId } = Route.useParams();
	const { view } = Route.useLoaderData();

	return (
		<SubWrapper
			title="Edit View"
			description="Manage settings for this saved view."
			style="compact"
			backButton={`/settings/org/${orgId}/views`}
			icon={<IconStack2 />}
		>
			<SettingsOrganizationViewDetailPage viewId={view?.id as string} initialView={view} />
		</SubWrapper>
	);
}
