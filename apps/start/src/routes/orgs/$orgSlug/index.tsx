import { createFileRoute } from "@tanstack/react-router";
import PublicOrgHomePage from "@/components/public";

/** Board filters other pages link to (a post's category or label). The board reads every param itself. */
interface BoardSearch {
	/** Category slug. */
	category?: string;
	/** `roadmap` = the roadmap kanban instead of the list. */
	layout?: string;
	/** Comma-separated label ids. */
	labels?: string;
	/** Opens the account settings dialog on this tab (see `PublicNavigation`). */
	settings?: string;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value ? value : undefined;
}

export const Route = createFileRoute("/orgs/$orgSlug/")({
	// Spread first so the board's other params (tab, sort, status, task...) are kept as they are.
	validateSearch: (search: Record<string, unknown>): BoardSearch => ({
		...search,
		category: asString(search.category),
		labels: asString(search.labels),
		layout: asString(search.layout),
		settings: asString(search.settings),
	}),
	component: OrgDashboard,
});

function OrgDashboard() {
	return <PublicOrgHomePage />;
}
