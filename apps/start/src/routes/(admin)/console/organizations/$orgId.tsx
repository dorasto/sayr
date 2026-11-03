import { createFileRoute, redirect } from "@tanstack/react-router";
import OrgDetail from "@/components/console/org-detail";
import { SubWrapper } from "@/components/generic/wrapper";
import type { ConsoleOrgDetail } from "@/lib/fetches/console";
import { getConsoleOrgServer } from "@/lib/serverFunctions/getConsoleData";
import { seo } from "@/seo";

export const Route = createFileRoute("/(admin)/console/organizations/$orgId")({
	loader: async ({ params, context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
		if (context.account.role !== "admin") {
			throw redirect({ to: "/" });
		}
		const result = await getConsoleOrgServer({
			data: { orgId: params.orgId },
		});
		if (!result) {
			throw redirect({ to: "/console" });
		}
		return result;
	},
	head: ({ loaderData }) => ({
		meta: seo({
			title: (loaderData as ConsoleOrgDetail | undefined)?.org?.name
				? `${(loaderData as ConsoleOrgDetail).org.name} · Console`
				: "Console",
		}),
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const data = Route.useLoaderData() as ConsoleOrgDetail;
	return (
		<SubWrapper
		// title={data.org.name}
		// description={`/${data.org.slug}`}
		>
			<OrgDetail data={data} />
		</SubWrapper>
	);
}
