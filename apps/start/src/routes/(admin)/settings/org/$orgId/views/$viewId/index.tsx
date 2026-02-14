import SettingsOrganizationViewDetailPage from "@/components/pages/admin/settings/orgId/view-detail";
import { db, schema } from "@repo/database";
import { Label } from "@repo/ui/components/label";
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
	const { view } = Route.useLoaderData();

	return (
		<div className="max-w-prose mx-auto p-3 md:p-6 w-full flex flex-col gap-9">
			<div className="flex flex-col">
				<Label variant="heading" className="text-2xl text-foreground">Edit View</Label>
				<Label variant="subheading" className="text-muted-foreground">Manage settings for this saved view.</Label>
			</div>
			<SettingsOrganizationViewDetailPage viewId={view?.id as string} initialView={view} />
		</div>
	);
}
