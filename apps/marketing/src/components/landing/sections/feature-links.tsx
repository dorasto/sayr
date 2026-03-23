import { FEATURES } from "@/data/features";

export function FeatureLinks() {
  return (
    <section className="py-16 px-6" id="features">
      <div className="max-w-(--breakpoint-lg) mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Everything included
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <a
                key={f.slug}
                href={`/features/${f.slug}`}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02] transition-colors p-4"
              >
                <div className="mt-0.5 shrink-0 size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/15 transition-colors">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug mb-0.5 group-hover:text-primary transition-colors">
                    {f.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {f.navDesc}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
