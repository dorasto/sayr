import { Github, Server, Code2, Users, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    icon: Code2,
    title: "Full Source Access",
    desc: "Every line of code is public. Feel free to explore, modify, and contribute.",
  },
  {
    icon: Server,
    title: "Self-Host with Docker",
    desc: "Run Sayr on your own infrastructure. Your data never leaves your servers.",
  },
  {
    icon: GitFork,
    title: "TypeScript",
    desc: "Built with React, Tanstack Start, Hono, and other popular libraries.",
  },
  {
    icon: Users,
    title: "Community Driven",
    desc: "Open to contributions. Submit PRs, file issues, or join the discussion.",
  },
];

export function OpenSourceHighlight() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-(--breakpoint-lg) mx-auto">
        <div className="relative overflow-hidden rounded-3xl border p-10 md:p-16">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-100 h-100 bg-primary/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-75 h-75 bg-primary/3 rounded-full blur-[60px]" />
          </div>

          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Github className="size-12 text-primary mb-6" />
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                100% Open Source
              </h2>
              <p className="text-muted-foreground mb-6">
                Every line of code is public. Fork it, self-host it on your own
                infrastructure with Docker, or contribute back to the project.
                No vendor lock-in, no surprises.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="rounded-full shadow-lg shadow-primary/20"
                  asChild
                >
                  <a
                    href="https://github.com/dorasto/sayr"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Github className="size-4" /> Star on GitHub
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full shadow-none"
                  asChild
                >
                  <a href="/docs/contributing/local-development">Contribute</a>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {highlights.map((h) => {
                const Icon = h.icon;
                return (
                  <div
                    key={h.title}
                    className="rounded-xl border bg-card/80 p-4 space-y-2"
                  >
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <p className="text-sm font-semibold leading-tight">
                      {h.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {h.desc}
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
