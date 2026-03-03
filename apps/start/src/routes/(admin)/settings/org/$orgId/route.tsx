import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SettingsProviderOrganization } from "@/contexts/ContextOrgSettings";
import {
	db,
	getIssueTemplates,
	getLabels,
	getOrganization,
	getReleases,
	getTasksByOrganizationId,
	schema,
} from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

export const getAdminOrganizationSettings = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string }) => data)
	.handler(async ({ data }) => {
		const { account, orgId } = data;
		try {
			if (!orgId) {
				throw redirect({ to: "/" });
			}
			const organization = await getOrganization(orgId, account.id, { includeUnseated: true });
			if (!organization) {
				throw redirect({ to: "/" });
			}
			const labels = await getLabels(organization.id);
			const tasks = await getTasksByOrganizationId(organization.id);
			const views = await db
				.select()
				.from(schema.savedView)
				.where(eq(schema.savedView.organizationId, organization.id));
			const categories = await db.query.category.findMany({
				where: (category) => eq(category.organizationId, organization.id),
			});
			const issueTemplates = await getIssueTemplates(organization.id);
			const releases = await getReleases(organization.id);
			return { organization, labels, views, categories, tasks, issueTemplates, releases };
		} catch (error) {
			console.log("🚀 ~ error:", error);
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});

export const Route = createFileRoute("/(admin)/settings/org/$orgId")({
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getAdminOrganizationSettings({
			data: {
				account: context.account,
				orgId: params.orgId,
			},
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { organization, labels, views, categories, tasks, issueTemplates, releases } = Route.useLoaderData();
	return (
		<SettingsProviderOrganization
			organization={organization}
			labels={labels}
			views={views}
			categories={categories}
			tasks={tasks}
			issueTemplates={issueTemplates}
			releases={releases}
		>
			<Outlet />
		</SettingsProviderOrganization>
	);
}
