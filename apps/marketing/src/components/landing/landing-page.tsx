import { HeroSection } from "./sections/hero-section";
import { ProblemSolution } from "./sections/problem-solution";
import { FeaturesSection } from "./sections/features-section";
import { VisibilityDemo } from "./sections/visibility-demo";
import { HowItWorks } from "./sections/how-it-works";
import { ComparisonSection } from "./sections/comparison-section";
import { OpenSourceHighlight } from "./sections/open-source-highlight";
import { PricingCards } from "./sections/pricing-cards";
import { FAQAccordion } from "./sections/faq-accordion";
import { CTASection } from "./sections/cta-section";

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
			<PricingCards />
			<FAQAccordion />
			<CTASection />
		</div>
	);
}
