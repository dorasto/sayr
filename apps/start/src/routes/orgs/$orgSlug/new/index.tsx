import { createFileRoute } from "@tanstack/react-router";
import { NewPostPage } from "@/components/public/portal/new/NewPostPage";

interface NewPostSearch {
	title?: string;
	category?: string;
}

function asNonEmptyString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value : undefined;
}

export const Route = createFileRoute("/orgs/$orgSlug/new/")({
	validateSearch: (search: Record<string, unknown>): NewPostSearch => ({
		title: asNonEmptyString(search.title),
		category: asNonEmptyString(search.category),
	}),
	component: NewPostRoute,
});

function NewPostRoute() {
	const { title, category } = Route.useSearch();
	return <NewPostPage initialTitle={title} initialCategory={category} />;
}
