import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/components/landing/landing-page";
import { SITE_URL, seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/")({
	component: LandingPage,
	head: () =>
		seoMeta({
			title: "Project tracker with public feedback and roadmap",
			description:
				"Sayr is a project tracker with a public side: your team plans and ships work, and your users post ideas, vote, and follow your roadmap and changelog. Free to start, EU-hosted or self-hosted.",
			path: "/",
			image: `${SITE_URL}/api/og?template=home`,
		}),
});
