import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "@/components/pricing/pricing-page";
import { seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/_marketing/pricing")({
	component: PricingPage,
	head: () =>
		seoMeta({
			title: "Pricing",
			description:
				"Transparent pricing for transparent project management. Start free with up to 5 members, upgrade to Pro for unlimited members, releases, and more.",
			path: "/pricing",
		}),
});
