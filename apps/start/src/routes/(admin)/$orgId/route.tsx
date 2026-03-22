import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderOrganization } from "@/contexts/ContextOrg";
import { useOrgCommands } from "@/hooks/commands/useOrgCommands";
import { getAdminOrganization } from "@/lib/serverFunctions/getAdminOrganization";
import { createServerFn } from "@tanstack/react-start";
import { getOrgPermissions, type schema } from "@repo/database";
import { seo, getOgImageUrl } from "@/seo";
import { PermissionError } from "@repo/util";

/**
 * Fetches all merged organization-level permissions for a user.
 *
 * Input: { account, orgId }
 * Output: { permissions }
 */
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
/**
 * Route configuration
 */
export const Route = createFileRoute("/(admin)/$orgId")({
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
		const { account, permissions } = context;
		if (!account) throw redirect({ to: "/login" });
		const org = await getAdminOrganization({
			data: {
				account,
				orgId: params.orgId,
				permissions: permissions as any,
			},
		});
		if (!org.organization.members.find(e => e.userId === account.id)?.seatAssigned) {
			throw new PermissionError();
		}
		return org;
	},
	// staleTime prevents refetching for this duration
	// Path params (orgId) automatically determine cache identity
	staleTime: 1000 * 60 * 5, // 5 minutes
	component: OrgLayout,
	head: ({ loaderData }) => ({
		meta: seo({
			title: `${loaderData?.organization.name || "Organization"}`,
			image: getOgImageUrl({
				type: "simple",
				title: loaderData?.organization.name,
				logo: loaderData?.organization.logo || undefined,
			}),
		}),
	}),
});

/**
 * Layout that wraps nested admin pages
 */
function OrgLayout() {
	const { organization, labels, views, categories, issueTemplates, releases, permissions } = Route.useLoaderData();
	return (
		<RootProviderOrganization
			organization={organization}
			labels={labels}
			views={views}
			categories={categories}
			issueTemplates={issueTemplates}
			releases={releases}
			permissions={permissions}
		>
			<OrgCommandRegistrar />
			<Outlet />
		</RootProviderOrganization>
	);
}

/** Registers org-specific commands. Must be rendered inside RootProviderOrganization. */
function OrgCommandRegistrar() {
	useOrgCommands();
	return null;
}
