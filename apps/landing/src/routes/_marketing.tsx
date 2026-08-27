import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navigationbar";

// Pathless layout route — wraps every marketing-surface page (landing,
// pricing, feature pages) in the shared Navbar/Footer chrome without adding
// a URL segment. Docs pages (Fumadocs, Phase 4) get their own layout route
// instead of this one, since a docs sidebar shell doesn't want the marketing
// nav/footer wrapped around it too.
export const Route = createFileRoute("/_marketing")({
  component: MarketingLayout,
});

function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
