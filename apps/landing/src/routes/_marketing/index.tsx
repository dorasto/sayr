import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/components/landing/landing-page";
import { seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/")({
	component: LandingPage,
	head: () =>
		seoMeta({
			title: "Sayr",
			description:
				"Sayr is a transparent, collaborative project management platform bridging internal workflows with public collaboration — kanban tasks, releases, and a live public portal your users can follow and vote on.",
			path: "/",
		}),
});
