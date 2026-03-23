import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    q: "What makes Sayr different from Linear or Jira?",
    a: "Linear and Jira are internal-only tools. Your users never see your board. Sayr has the same project management capabilities - kanban boards, releases (sprints), priorities, GitHub integration - but adds a public-facing portal where external users can view tasks, vote, submit feedback, and track progress. You control exactly what's visible.",
  },
  {
    q: "How does Sayr compare to Canny or Nolt?",
    a: "Canny and Nolt are great for collecting feedback, but they're separate from where work actually happens. With Sayr, user feedback is a task on your board. No syncing between tools. When you move a task to 'Done', users see it immediately.",
  },
  {
    q: "Is it free to self-host?",
    a: "Sayr is source available and free to self-host with Docker Compose, Railway, or anywhere you like. The core features are included out of the box. Some advanced features may require a license key - similar to how GitLab offers a free community edition alongside premium tiers. Pricing details are still being finalized.",
  },
  {
    q: "How does visibility work?",
    a: "Visibility in Sayr is set at the entity level. Each task can be marked as public or private - private tasks are completely hidden from external users. Labels also have their own visibility, so you can have public labels like 'Bug' alongside private ones like 'needs review'. Comments can be public or internal - internal comments are only visible to your team. When a task is public, external users see it along with its public labels and public comments, but not private information.",
  },
  {
    q: "Can external users create accounts?",
    a: "Yes. External users can sign up through your public portal using OAuth (GitHub, etc.) and submit bug reports, feature requests, vote on existing tasks, and leave public comments. They can never see internal data.",
  },
  {
    q: "What tech stack does Sayr use?",
    a: "TypeScript throughout. React 19 with TanStack Start for the frontend, Hono on Bun for the backend API, PostgreSQL with Drizzle ORM for the database, Server‑Sent Events (SSE) for real-time updates, and Better Auth for authentication. The full stack is documented in the repo.",
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 px-6">
      <div className="max-w-(--breakpoint-md) mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="rounded-full py-1 px-3 mb-4">
            FAQ
          </Badge>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
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
  );
}
