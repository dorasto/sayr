import { Hero } from "./hero/hero";
import { ProductTabs } from "./product-tabs/product-tabs";
import { ComparisonSection } from "./sections/comparison-section";
import { CTASection } from "./sections/cta-section";
import { FAQAccordion } from "./sections/faq-accordion";
import { FeatureLinks } from "./sections/feature-links";
import { IntegrationsSection } from "./sections/integrations-section";
import { OwnYourData } from "./sections/own-your-data";
import { PricingCards } from "./sections/pricing-cards";
import { TeamsSection } from "./sections/teams-section";

export default function LandingPage() {
	return (
		<div className="w-full">
			<Hero />
			<ProductTabs />
			<IntegrationsSection />
			<ComparisonSection />
			<TeamsSection />
			<OwnYourData />
			<PricingCards />
			<FAQAccordion />
			<FeatureLinks />
			<CTASection />
		</div>
	);
}
