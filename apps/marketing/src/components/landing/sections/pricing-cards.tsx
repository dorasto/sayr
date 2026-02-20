import { ArrowUpRight, Check, Server, Cloud, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import pricingData from "@/data/pricing.json";

function TierCard({ tier }: { tier: (typeof pricingData.tiers)[number] }) {
  const isHighlighted = tier.highlighted;
  const isSelfHosted = tier.id === "self-hosted";

  return (
    <div
      className={`rounded-2xl p-8 relative ${
        isHighlighted
          ? "border-2 border-primary/30 bg-card shadow-lg shadow-primary/5"
          : "border bg-card"
      }`}
    >
      {isHighlighted && (
        <Badge className="absolute -top-3 right-6 text-xs shadow-lg shadow-primary/20">
          Recommended
        </Badge>
      )}
      {isSelfHosted ? (
        <Server className="size-8 text-muted-foreground mb-4" />
      ) : isHighlighted ? (
        <Sparkles className="size-8 text-primary mb-4" />
      ) : (
        <Cloud className="size-8 text-muted-foreground mb-4" />
      )}
      <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
      <div className="mt-3 mb-1">
        {tier.price === null ? (
          <p className="text-4xl font-bold">Free</p>
        ) : tier.price === 0 ? (
          <p className="text-4xl font-bold">$0</p>
        ) : (
          <p className="text-4xl font-bold">
            ${tier.price}
            <span className="text-base font-normal text-muted-foreground">
              {tier.priceSuffix}
            </span>
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-8">{tier.description}</p>
      <ul className="space-y-3 mb-8">
        {getHighlightsForTier(tier.id).map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Check className="size-4 text-primary shrink-0" /> {f}
          </li>
        ))}
      </ul>
      <Button
        variant={isHighlighted ? "default" : "outline"}
        className={`w-full rounded-full ${isHighlighted ? "shadow-lg shadow-primary/20" : ""}`}
        asChild
      >
        <a href={tier.cta.href}>
          {tier.cta.label}{" "}
          {!isSelfHosted && <ArrowUpRight className="size-4" />}
        </a>
      </Button>
    </div>
  );
}

function getHighlightsForTier(tierId: string): string[] {
  switch (tierId) {
    case "free":
      return [
        "Up to 5 members",
        "Unlimited tasks",
        "Public portal & voting",
        "GitHub integration",
        "Real-time collaboration",
        "Full API access",
      ];
    case "pro":
      return [
        "Everything in Free",
        "Unlimited members",
        "Releases & milestones",
        "Unlimited saved views",
        "Unlimited issue templates",
        "Unlimited teams & permissions",
      ];
    case "self-hosted":
      return [
        "All features unlocked",
        "Docker Compose deployment",
        "Full data sovereignty",
        "Community support",
      ];
    default:
      return [];
  }
}

export function PricingCards() {
  return (
    <section className="py-24 px-6 relative" id="pricing">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--primary)_0%,transparent_50%)] opacity-[0.03]" />

      <div className="relative z-10 max-w-(--breakpoint-lg) mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
            Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Transparent pricing for a transparent tool
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Scale when you're ready. Self-host if you prefer.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingData.tiers.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-muted-foreground">
          Need more details?{" "}
          <a href="/pricing" className="text-primary hover:underline">
            View full feature comparison
          </a>
        </p>
      </div>
    </section>
  );
}
