import { createFileRoute, redirect } from "@tanstack/react-router";

/** The viewer's activity now lives in the account settings dialog; old links open it there. */
export const Route = createFileRoute("/orgs/$orgSlug/activity/")({
	beforeLoad: ({ params }) => {
		throw redirect({ to: "/orgs/$orgSlug", params: { orgSlug: params.orgSlug }, search: { settings: "activity" } });
	},
});
