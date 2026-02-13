import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-(--breakpoint-md) mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
          Stop hiding your roadmap.{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Start building transparently.
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10">
          Open source. Self-hostable. Cloud available. Give your users the
          visibility they deserve.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            className="rounded-full text-base px-8 shadow-lg shadow-primary/20"
            asChild
          >
            <a href="https://admin.sayr.io">
              Get Started <ArrowUpRight className="h-5! w-5!" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full text-base shadow-none"
            asChild
          >
            <a href="/docs">Read the Docs</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
