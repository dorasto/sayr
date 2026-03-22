import { Shield, MapPin, Database, Server, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const euPoints = [
  {
    icon: MapPin,
    title: "Irish company",
    desc: "Incorporated and operated in Ireland, fully subject to EU law.",
  },
  {
    icon: Server,
    title: "EU infrastructure",
    desc: "Fully hosted on Zerops (Czechia) — compute, databases, and Redis all within the EU.",
  },
  {
    icon: Database,
    title: "EU data storage",
    desc: "Your data stays inside the EU. Files on Hetzner (Germany & Finland), databases on Zerops (Czechia).",
  },
  {
    icon: Globe,
    title: "EU CDN",
    desc: "Static assets delivered via Bunny CDN, a Slovenian company.",
  },
];

export function EUHighlight() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-(--breakpoint-lg) mx-auto">
        <div className="relative overflow-hidden rounded-3xl border bg-card/60 p-8 md:p-12">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-[80px]" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
            {/* Left: text */}
            <div className="shrink-0 max-w-xs">
              <Badge
                variant="secondary"
                className="rounded-full py-1 px-3 mb-4 text-xs"
              >
                Built in the EU 🇪🇺
              </Badge>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
                Proudly European, top to bottom
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed!">
                Sayr is owned and operated by the Irish company Doras Media Ltd,
                running on EU infrastructure.
              </p>
              <a
                href="/legal/subprocessors"
                className="inline-block mt-4 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              >
                View all subprocessors
              </a>
            </div>

            {/* Right: grid */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {euPoints.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="rounded-xl border bg-background/60 p-4 space-y-2"
                  >
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <p className="text-sm font-semibold leading-tight">
                      {p.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed!">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
