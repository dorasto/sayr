import { ArrowUpRight, Check, Server, Cloud, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import pricingData from "@/data/pricing.json";

function TierCard({ tier }: { tier: (typeof pricingData.tiers)[number] }) {
  const isHighlighted = tier.highlighted;

  return (
    <div
      className={`rounded-2xl p-8 relative h-full flex flex-col ${
        isHighlighted
          ? "border-2 border-primary/30 bg-card shadow-lg shadow-primary/5 scale-100"
          : "border bg-card scale-y-90"
      }`}
    >
      {isHighlighted && (
        <Badge className="absolute -top-3 right-6 text-xs shadow-lg shadow-primary/20">
          Recommended
        </Badge>
      )}
      <div className="flex items-start gap-4 mb-3">
        {isHighlighted ? (
          <Sparkles className="size-10 text-primary shrink-0 mt-1" />
        ) : (
          <Cloud className="size-10 text-muted-foreground shrink-0 mt-1" />
        )}
        <div>
          <h3 className="text-xl font-semibold">{tier.name}</h3>
          {tier.price === null ? (
            <p className="text-lg font-bold">Free</p>
          ) : tier.price === 0 ? (
            <p className="text-lg font-bold">$0</p>
          ) : (
            <p className="text-lg font-bold">
              {typeof tier.price === "number" ? `$${tier.price}` : tier.price}
              <span className="text-base font-normal text-muted-foreground">
                {tier.priceSuffix}
              </span>
            </p>
          )}
        </div>
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
        className={`w-full rounded-full mt-auto ${isHighlighted ? "shadow-lg shadow-primary/20" : ""}`}
        asChild
      >
        <a href={tier.cta.href}>
          {tier.cta.label} <ArrowUpRight className="size-4" />
        </a>
      </Button>
    </div>
  );
}

function SelfHostedCard({
  tier,
}: {
  tier: (typeof pricingData.tiers)[number];
}) {
  return (
    <div className="rounded-2xl border bg-card p-8 md:p-6 flex flex-col md:flex-row md:items-center gap-8">
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-3">
          <Server className="size-10 text-muted-foreground shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-semibold">{tier.name}</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{tier.description}</p>
      </div>
      <div className="flex-1">
        <ul className="grid sm:grid-cols-2 gap-3">
          {getHighlightsForTier(tier.id).map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Check className="size-4 text-primary shrink-0" /> {f}
            </li>
          ))}
        </ul>
      </div>
      <div className="md:w-48 shrink-0">
        <Button variant="outline" className="w-full rounded-full" asChild>
          <a href={tier.cta.href}>{tier.cta.label}</a>
        </Button>
      </div>
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
    case "enterprise":
      return [
        "Everything in Pro",
        "Self-hosted deployment",
        "Priority support",
        "License key activation",
      ];
    case "self-hosted":
      return [
        "Single organization",
        "Docker deployment",
        "Full data sovereignty",
        "Community support",
      ];
    default:
      return [];
  }
}

export function PricingCards() {
  const cloudTiers = pricingData.tiers.filter((t) => t.id !== "self-hosted");
  const selfHostedTier = pricingData.tiers.find((t) => t.id === "self-hosted");

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

        <div className="grid md:grid-cols-3 gap-3 max-w-5xl mx-auto">
          {cloudTiers.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        {selfHostedTier && (
          <div className="max-w-5xl mx-auto mt-6">
            <SelfHostedCard tier={selfHostedTier} />
          </div>
        )}

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
