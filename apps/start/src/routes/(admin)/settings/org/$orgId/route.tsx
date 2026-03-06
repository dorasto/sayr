import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SettingsProviderOrganization } from "@/contexts/ContextOrgSettings";
import {
	db,
	getIssueTemplates,
	getLabels,
	getOrganization,
	getOrgPermissions,
	getReleases,
	getTasksByOrganizationId,
	schema,
} from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

export const getAdminOrganizationSettings = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string; permissions: schema.TeamPermissions }) => data)
	.handler(async ({ data }) => {
		const { account, orgId, permissions } = data;
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
			return { organization, labels, views, categories, tasks, issueTemplates, releases, permissions };
		} catch (error) {
			console.log("🚀 ~ error:", error);
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});
export const getUserOrgPermissions = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string }) => data)
	.handler(async ({ data }) => {
		try {
			const permissions = await getOrgPermissions(data.account.id, data.orgId);
			return {
				account: data.account,
				orgId: data.orgId,
				permissions,
			};
		} catch (error) {
			console.error("Error fetching org permissions:", error);
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/login" });
		}
	});
export const Route = createFileRoute("/(admin)/settings/org/$orgId")({
	beforeLoad: async ({ params, context, location }) => {
		const { account } = context;

		// ❌ Skip non-app / internal routes
		if (
			location.external ||
			location.pathname.startsWith("/.well-known")
		) {
			return;
		}

		const searchParams = new URLSearchParams(location.search);
		const currentUrl = `${location.pathname}${searchParams.toString()
			? `?${searchParams.toString()}`
			: ""
			}`;

		if (!account) {
			throw redirect({
				to: "/login",
				headers: {
					"Set-Cookie": `post_login_redirect=${encodeURIComponent(
						currentUrl
					)}; Path=/; HttpOnly; SameSite=Lax`,
				},
			});
		}

		const { permissions } = await getUserOrgPermissions({
			data: {
				account,
				orgId: params.orgId,
			},
		});

		return { permissions };
	},
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getAdminOrganizationSettings({
			data: {
				account: context.account,
				orgId: params.orgId,
				permissions: context.permissions as any,
			},
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { organization, labels, views, categories, tasks, issueTemplates, releases, permissions } = Route.useLoaderData();
	return (
		<SettingsProviderOrganization
			organization={organization}
			labels={labels}
			views={views}
			categories={categories}
			tasks={tasks}
			issueTemplates={issueTemplates}
			releases={releases}
			permissions={permissions}
		>
			<Outlet />
		</SettingsProviderOrganization>
	);
}
