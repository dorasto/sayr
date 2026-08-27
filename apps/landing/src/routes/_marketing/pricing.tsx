import { createFileRoute } from "@tanstack/react-router";
import { PricingPage } from "@/components/pricing/pricing-page";

export const Route = createFileRoute("/_marketing/pricing")({
	component: PricingPage,
	head: () => ({
		meta: [
			{ title: "Pricing - Sayr" },
			{
				name: "description",
				content:
					"Transparent pricing for transparent project management. Start free with up to 5 members, upgrade to Pro for unlimited members, releases, and more.",
			},
		],
	}),
});
