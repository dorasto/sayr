import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import { IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import pricingData from "@/data/pricing.json";

type TierValue = boolean | string;

function FeatureValue({
  value,
  featureName,
}: {
  value: TierValue;
  featureName: string;
}) {
  if (value === false) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="size-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
          <IconX className="size-3 text-destructive" />
        </div>
        <span className="text-sm text-muted-foreground/50">{featureName}</span>
      </div>
    );
  }

  const label = typeof value === "string" ? value : featureName;
  const words = label.split(" ");
  const firstWord = words[0];
  const rest = words.slice(1).join(" ");

  return (
    <div className="flex items-center gap-2.5">
      <div className="size-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <Check className="size-3 text-primary" />
      </div>
      <span className="text-sm text-muted-foreground">
        <span className="text-foreground font-medium">{firstWord}</span> {rest}
      </span>
    </div>
  );
}

const pricingFaqs = [
  {
    q: "What counts as a seat?",
    a: "Only members of your organization count as seats. External users who view your public portal, vote on tasks, or leave public comments are always free and unlimited.",
  },
  {
    q: "What happens when I hit 5 members on Free?",
    a: "You'll need to upgrade to Pro to invite additional members. Your existing tasks, views, and data are unaffected.",
  },
  {
    q: "Can I switch between plans?",
    a: "Yes, you can upgrade or downgrade at any time. When downgrading, you'll retain access to Pro features until the end of your billing period.",
  },
  {
    q: "What is a release?",
    a: "Releases let you group tasks into milestones or sprints, track progress toward a target date, and mark them as shipped. They're available on Pro and self-hosted.",
  },
];

export function PricingPage() {
  const tiers = pricingData.tiers;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeTierId, setActiveTierId] = useState<string>(tiers[0].id);

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="py-16 sm:py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Transparent pricing for a transparent tool
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free with up to 5 members. Upgrade when your team grows.
            Self-host for full control.
          </p>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-(--breakpoint-lg)">
          {/* Mobile: pill tier selector */}
          <div className="md:hidden mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {tiers.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setActiveTierId(tier.id)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
                    activeTierId === tier.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  {tier.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile: active tier pricing card */}
          <div className="md:hidden mb-6">
            {tiers
              .filter((t) => t.id === activeTierId)
              .map((tier) => (
                <div
                  key={tier.id}
                  className={cn(
                    "rounded-xl border p-5",
                    tier.highlighted ? "bg-card border-primary/30" : "bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {tier.name}
                      </p>
                      {tier.price === null || tier.price === 0 ? (
                        <p
                          className="text-2xl font-semibold invisible select-none"
                          aria-hidden="true"
                        >
                          —
                        </p>
                      ) : typeof tier.price === "number" ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-semibold">
                            ${tier.price}
                          </span>
                          {tier.priceSuffix && (
                            <span className="text-sm text-muted-foreground">
                              {tier.priceSuffix}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-2xl font-semibold">{tier.price}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={tier.highlighted ? "default" : "outline"}
                      className="rounded-full shrink-0"
                      asChild
                    >
                      <a href={tier.cta.href}>{tier.cta.label}</a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>
              ))}
          </div>

          {/* Mobile: single-column feature list */}
          <div className="md:hidden">
            {pricingData.featureGroups.map((group) => (
              <div key={group.name} className="mb-6">
                <h3 className="text-sm font-semibold text-foreground px-1 mb-2">
                  {group.name}
                </h3>
                <div className="rounded-xl border bg-card divide-y divide-border overflow-hidden">
                  {group.features.map((feature) => {
                    const value =
                      feature.tiers[activeTierId as keyof typeof feature.tiers];
                    return (
                      <div key={feature.name} className="px-4 py-3">
                        <FeatureValue
                          value={value}
                          featureName={feature.name}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: full comparison grid */}
          <div className="hidden md:block">
            {/* Tier headers */}
            <div className="grid grid-cols-4 gap-0 sticky top-15 border-b">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={cn(
                    "px-3 bg-background",
                    tier.highlighted && "bg-card rounded-t-lg",
                  )}
                >
                  <div className="flex flex-col gap-1 p-3 pb-4">
                    <h2 className="text-xl! font-semibold">{tier.name}</h2>
                    {tier.price === null || tier.price === 0 ? (
                      <p
                        className="text-lg font-semibold invisible select-none"
                        aria-hidden="true"
                      >
                        —
                      </p>
                    ) : typeof tier.price === "number" ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-semibold">
                          ${tier.price}
                        </span>
                        {tier.priceSuffix && (
                          <span className="text-xs text-muted-foreground">
                            {tier.priceSuffix}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-lg font-semibold">{tier.price}</p>
                    )}
                    {/*<p className="text-xs text-muted-foreground leading-snug">{tier.description}</p>*/}
                    <Button
                      size="sm"
                      variant={tier.highlighted ? "default" : "outline"}
                      className="rounded-full mt-2 w-full text-xs"
                      asChild
                    >
                      <a href={tier.cta.href}>{tier.cta.label}</a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {pricingData.featureGroups.map((group) => (
              <div key={group.name}>
                {/* Group header */}
                <div className="grid grid-cols-4 gap-0">
                  {tiers.map((tier, i) => (
                    <div
                      key={tier.id}
                      className={cn(
                        "px-6 py-3 bg-background",
                        tier.highlighted && "bg-card",
                      )}
                    >
                      {i === 0 && (
                        <h3 className="text-sm font-semibold text-foreground">
                          {group.name}
                        </h3>
                      )}
                    </div>
                  ))}
                </div>

                {/* Features */}
                {group.features.map((feature) => (
                  <div key={feature.name} className="grid grid-cols-4 gap-0">
                    {tiers.map((tier) => {
                      const value =
                        feature.tiers[tier.id as keyof typeof feature.tiers];
                      return (
                        <div
                          key={tier.id}
                          className={cn(
                            "px-6 py-3 bg-background",
                            tier.highlighted && "bg-card",
                          )}
                        >
                          <FeatureValue
                            value={value}
                            featureName={feature.name}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}

            {/* Bottom border for highlighted column */}
            <div className="grid grid-cols-4 gap-0">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={cn(tier.highlighted && "rounded-b-lg h-4 bg-card")}
                />
              ))}
            </div>
          </div>

          <p className="text-center mt-10 text-sm text-muted-foreground">
            All prices are per organization. Only internal members count as
            seats &mdash; public users who vote and comment are always free.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight mb-8 text-center">
            Common questions
          </h2>
          <div className="space-y-2">
            {pricingFaqs.map((faq, i) => (
              <div
                key={faq.q}
                className="rounded-xl border bg-card overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform shrink-0 ml-4 ${openIndex === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your first organization in under a minute. No credit card
            required.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              className="rounded-full shadow-lg shadow-primary/20"
              asChild
            >
              <a href="https://admin.sayr.io">
                Start Free <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <Button variant="outline" className="rounded-full" asChild>
              <a href="/docs">Read the Docs</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
