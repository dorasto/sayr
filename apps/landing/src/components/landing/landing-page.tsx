import { ComparisonSection } from "./sections/comparison-section";
import { CTASection } from "./sections/cta-section";
import { EUHighlight } from "./sections/eu-highlight";
import { FAQAccordion } from "./sections/faq-accordion";
import { FeatureLinks } from "./sections/feature-links";
import { FeaturesSection } from "./sections/features-section";
import { HeroSection } from "./sections/hero-section";
import { HowItWorks } from "./sections/how-it-works";
import { OpenSourceHighlight } from "./sections/open-source-highlight";
import { PricingCards } from "./sections/pricing-cards";
import { ProblemSolution } from "./sections/problem-solution";
import { VisibilityDemo } from "./sections/visibility-demo";

export default function LandingPage() {
	return (
		<div className="w-full">
			<HeroSection />
			<ProblemSolution />
			<FeaturesSection />
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
