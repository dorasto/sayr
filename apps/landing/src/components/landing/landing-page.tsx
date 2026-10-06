import { Hero } from "./hero/hero";
import { ProductTabs } from "./product-tabs/product-tabs";
import { ComparisonSection } from "./sections/comparison-section";
import { CTASection } from "./sections/cta-section";
import { EUHighlight } from "./sections/eu-highlight";
import { FAQAccordion } from "./sections/faq-accordion";
import { FeatureLinks } from "./sections/feature-links";
import { HowItWorks } from "./sections/how-it-works";
import { OpenSourceHighlight } from "./sections/open-source-highlight";
import { PricingCards } from "./sections/pricing-cards";
import { ProblemSolution } from "./sections/problem-solution";
import { VisibilityDemo } from "./sections/visibility-demo";

export default function LandingPage() {
	return (
		<div className="w-full">
			<Hero />
			<ProblemSolution />
			<ProductTabs />
			<VisibilityDemo />
			<HowItWorks />
			<ComparisonSection />
			<OpenSourceHighlight />
			<EUHighlight />
			<PricingCards />
			<FAQAccordion />
			<FeatureLinks />
			<CTASection />
		</div>
	);
}
