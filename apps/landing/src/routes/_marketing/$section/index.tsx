import { createFileRoute, notFound } from "@tanstack/react-router";
import { getSectionPages, isSection, pagePath, SECTIONS } from "@/data/marketing-pages";
import { breadcrumbJsonLd, seoMeta } from "@/lib/seo";

/**
 * Hub page for a marketing section (/compare, /alternatives, …): lists its
 * pages, so every page is one link from a crawlable index. Unknown or empty
 * sections 404, so search engines never index a thin "nothing here" page.
 */
export const Route = createFileRoute("/_marketing/$section/")({
	// Thrown from the loader (not beforeLoad) so the server responds with a real 404.
	loader: ({ params }) => {
		if (!isSection(params.section) || getSectionPages(params.section).length === 0) throw notFound();
	},
	head: ({ params }) => {
		if (!isSection(params.section)) return {};
		const section = SECTIONS[params.section];
		const path = `/${params.section}`;
		return {
			...seoMeta({ title: section.title, description: section.description, path }),
			scripts: [breadcrumbJsonLd([[section.label, path]])],
		};
	},
	component: SectionIndex,
});

function SectionIndex() {
	const { section: sectionId } = Route.useParams();
	if (!isSection(sectionId)) throw notFound();
	const section = SECTIONS[sectionId];
	const pages = getSectionPages(sectionId);

	return (
		<section className="px-6 pt-16 pb-24">
			<div className="mx-auto max-w-(--breakpoint-md)">
				<p className="mb-3 font-medium text-primary text-sm">{section.label}</p>
				<h1 className="mb-5 font-semibold text-4xl tracking-tight md:text-5xl">{section.title}</h1>
				<p className="text-lg text-muted-foreground leading-relaxed">{section.description}</p>

				<div className="mt-12 grid gap-3">
					{pages.map((page) => (
						<a
							key={page.slug}
							href={pagePath(page)}
							className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/30"
						>
							<h2 className="font-semibold">{page.heading}</h2>
							<p className="mt-1 text-muted-foreground text-sm leading-relaxed">{page.subheading}</p>
						</a>
					))}
				</div>
			</div>
		</section>
	);
}
