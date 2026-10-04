import { createFileRoute, redirect } from "@tanstack/react-router";

/** The roadmap is now a layout of the Feedback board; old links land there. */
export const Route = createFileRoute("/orgs/$orgSlug/roadmap/")({
	beforeLoad: ({ params }) => {
		throw redirect({ to: "/orgs/$orgSlug", params: { orgSlug: params.orgSlug }, search: { layout: "roadmap" } });
	},
});
