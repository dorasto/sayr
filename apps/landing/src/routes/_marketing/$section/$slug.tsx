import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { ArrowUpRight } from "lucide-react";
import { ComparisonPage } from "@/components/compare/comparison-page";
import { getMDXComponents } from "@/components/mdx";
import { getComparison } from "@/data/comparisons";
import { getPage, getRelatedPages, type MarketingPage, pagePath, SECTIONS } from "@/data/marketing-pages";
import { breadcrumbJsonLd, jsonLdScript, SITE_NAME, SITE_URL, seoMeta } from "@/lib/seo";

/**
 * Marketing SEO pages: /compare/*, /alternatives/*, /solutions/*,
 * /integrations/*, /guides/*. Metadata comes from src/data/marketing-pages.ts,
 * the body from content/pages/<section>/<slug>.mdx, except /compare/* pages,
 * which fill the comparison template from src/data/comparisons.ts. Static routes like
 * /features/$slug and /legal/* take precedence over this one.
 */
export const Route = createFileRoute("/_marketing/$section/$slug")({
	// Same reason as features/$slug: keep the loader, MDX components and docs
	// client loader out of the main entry (and off the homepage).
	codeSplitGroupings: [["loader", "component"]],
	component: Page,
	loader: async ({ params }) => {
		const data = await serverLoader({ data: params });
		if (data.path) await clientLoader.preload(data.path);
		return data;
	},
	head: ({ params }) => {
		const page = getPage(params.section, params.slug);
		if (!page) return {};
		const path = pagePath(page);
		const section = SECTIONS[page.section];
		const comparison = page.section === "compare" ? getComparison(page.slug) : undefined;
		return {
			...seoMeta({ title: page.title, description: page.description, path, type: "article" }),
			scripts: [
				jsonLdScript({
					"@type": "Article",
					headline: page.heading,
					description: page.description,
					dateModified: page.updated,
					mainEntityOfPage: `${SITE_URL}${path}`,
					author: { "@type": "Organization", name: "Doras Media Ltd", url: SITE_URL },
					publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
				}),
				breadcrumbJsonLd([
					[section.label, `/${page.section}`],
					[page.heading, path],
				]),
				...(comparison
					? [
							jsonLdScript({
								"@type": "FAQPage",
								mainEntity: comparison.faqs.map((faq) => ({
									"@type": "Question",
									name: faq.q,
									acceptedAnswer: { "@type": "Answer", text: faq.a },
								})),
							}),
						]
					: []),
			],
		};
	},
});

const serverLoader = createServerFn({ method: "GET" })
	.inputValidator((params: { section: string; slug: string }) => params)
	.handler(async ({ data: { section, slug } }) => {
		if (!getPage(section, slug)) throw notFound();
		if (section === "compare" && getComparison(slug)) return { path: null, section, slug };

		const { pages } = await import("collections/server");
		const filePath = `${section}/${slug}.mdx`;
		const entry = pages.find((page) => page.info.path === filePath);
		if (!entry) throw notFound();

		return { path: entry.info.path, section, slug };
	});

const clientLoader = browserCollections.pages.createClientLoader({
	component({ default: MDX }) {
		return <MDX components={getMDXComponents()} />;
	},
});

function formatUpdated(date: string) {
	return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}

function Page() {
	const data = Route.useLoaderData();
	const page = getPage(data.section, data.slug);
	if (!page) throw notFound();
	const related = getRelatedPages(page.related);
	const comparison = page.section === "compare" ? getComparison(page.slug) : undefined;
	if (comparison)
		return <ComparisonPage data={comparison} page={page} updated={formatUpdated(page.updated)} related={related} />;
	if (!data.path) throw notFound();
	return <ArticlePage page={page} path={data.path} related={related} />;
}

function ArticlePage({ page, path, related }: { page: MarketingPage; path: string; related: MarketingPage[] }) {
	const content = clientLoader.useContent(path);
	const section = SECTIONS[page.section];
	const updated = formatUpdated(page.updated);

	return (
		<article className="px-6 pt-16 pb-24">
			<header className="mx-auto max-w-(--breakpoint-md)">
				<nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-2 text-muted-foreground text-xs">
					<a href="/" className="hover:text-foreground">
						Home
					</a>
					<span aria-hidden>/</span>
					<a href={`/${page.section}`} className="hover:text-foreground">
						{section.label}
					</a>
				</nav>
				<h1 className="mb-5 font-semibold text-4xl tracking-tight md:text-5xl">{page.heading}</h1>
				<p className="text-lg text-muted-foreground leading-relaxed md:text-xl">{page.subheading}</p>
				<p className="mt-6 text-muted-foreground text-xs">
					Updated <time dateTime={page.updated}>{updated}</time>
				</p>
			</header>

			<div
				className="prose prose-neutral dark:prose-invert mx-auto mt-12 max-w-(--breakpoint-md)
				prose-headings:font-semibold prose-headings:tracking-tight
				prose-h2:mt-16 prose-h2:mb-4 prose-h2:text-3xl prose-h3:mt-10 prose-h3:mb-3 prose-h3:text-xl
				prose-p:my-4 prose-p:text-base prose-p:text-muted-foreground prose-p:leading-relaxed
				prose-ul:my-6 prose-ul:list-disc prose-ul:space-y-2 prose-ul:pl-6 [&_ul]:list-disc [&_ul]:pl-6
				prose-ol:my-6 prose-ol:list-decimal prose-ol:space-y-2 prose-ol:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
				prose-li:text-muted-foreground prose-li:leading-relaxed
				prose-strong:font-semibold prose-strong:text-foreground
				prose-a:text-primary prose-a:no-underline hover:prose-a:underline
				prose-code:rounded prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-primary prose-code:text-sm prose-code:before:content-none prose-code:after:content-none"
			>
				{content}
			</div>

			<div className="mx-auto max-w-(--breakpoint-md)">
				{related.length > 0 && (
					<nav aria-label="Related pages" className="mt-16">
						<p className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-widest">Related</p>
						<div className="grid gap-3 sm:grid-cols-2">
							{related.map((item) => (
								<a
									key={pagePath(item)}
									href={pagePath(item)}
									className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
								>
									<p className="font-semibold text-sm">{item.heading}</p>
									<p className="mt-1 text-muted-foreground text-xs leading-relaxed">{item.subheading}</p>
								</a>
							))}
						</div>
					</nav>
				)}

				<div className="mt-16 rounded-2xl border bg-card p-8 text-center">
					<h2 className="mb-3 font-semibold text-2xl tracking-tight">Try Sayr free</h2>
					<p className="mx-auto mb-6 max-w-md text-muted-foreground">
						Free for up to 5 members, with unlimited voters on your public board. Or self-host it for free.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-4">
						<a
							href="https://admin.sayr.io"
							className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground text-sm shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
						>
							Get started <ArrowUpRight className="size-4" />
						</a>
						<a
							href="/pricing"
							className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 font-semibold text-sm transition-colors hover:bg-muted"
						>
							View pricing
						</a>
					</div>
				</div>
			</div>
		</article>
	);
}
