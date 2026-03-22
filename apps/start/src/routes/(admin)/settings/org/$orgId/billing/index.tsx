import { SubWrapper } from "@/components/generic/wrapper";
import SettingsOrganizationBillingPage from "@/components/pages/admin/settings/orgId/billing";
import { db, schema } from "@repo/database";
import { getEffectiveLimits } from "@repo/edition";
import { eq } from "drizzle-orm";
import { PermissionError } from "@repo/util";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { seo } from "@/seo";

const edition = import.meta.env.VITE_SAYR_EDITION ?? "community";

const fetchPlanLimits = createServerFn({ method: "GET" })
	.inputValidator((data: { orgId: string }) => data)
	.handler(async ({ data }) => {
		const org = await db.query.organization.findFirst({
			where: eq(schema.organization.id, data.orgId),
			columns: { plan: true },
		});
		return getEffectiveLimits(org?.plan);
	});

export const Route = createFileRoute("/(admin)/settings/org/$orgId/billing/")({
	head: () => ({ meta: seo({ title: "Billing · Settings" }) }),
	async loader(ctx) {
		// Billing is only available on the cloud edition
		if (edition !== "cloud") {
			throw redirect({
				to: "/settings/org/$orgId",
				params: { orgId: ctx.params.orgId },
			});
		}
		if (!ctx.context.permissions?.admin.billing) {
			throw new PermissionError();
		}
		const limits = await fetchPlanLimits({ data: { orgId: ctx.params.orgId } });
		return { limits };
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { limits } = Route.useLoaderData();
	return (
		<SubWrapper title="Billing" description="Manage your plan, usage, and invoices." style="compact">
			<SettingsOrganizationBillingPage limits={limits} />
		</SubWrapper>
	);
}
