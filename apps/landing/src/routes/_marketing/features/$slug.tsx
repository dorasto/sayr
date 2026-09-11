import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { ArrowUpRight } from "lucide-react";
import { RelatedFeatures } from "@/components/features/related-features";
import { getMDXComponents } from "@/components/mdx";
import { getFeature } from "@/data/features";

export const Route = createFileRoute("/_marketing/features/$slug")({
	component: Page,
	loader: async ({ params }) => {
		const data = await serverLoader({ data: params.slug });
		await clientLoader.preload(data.path);
		return data;
	},
	head: ({ params }) => {
		const meta = getFeature(params.slug);
		if (!meta) return {};
		return {
			meta: [{ title: `${meta.title} - Sayr` }, { name: "description", content: meta.description }],
		};
	},
});

const serverLoader = createServerFn({ method: "GET" })
	.inputValidator((slug: string) => slug)
	.handler(async ({ data: slug }) => {
		if (!getFeature(slug)) throw notFound();

		const { features } = await import("collections/server");
		const entry = features.find((f) => f.info.path === `${slug}.mdx`);
		if (!entry) throw notFound();

		return { path: entry.info.path, slug };
	});

const clientLoader = browserCollections.features.createClientLoader({
	component({ default: MDX }) {
		return <MDX components={getMDXComponents()} />;
	},
});

function Page() {
	const data = Route.useLoaderData();
	const content = clientLoader.useContent(data.path);
	const meta = getFeature(data.slug);
	if (!meta) throw notFound();

	const { heroHeadline, heroSubcopy, related, headerImage, icon: Icon, docs } = meta;

	return (
		<>
			{/* Hero */}
			<section className="pt-16 pb-16 px-6 relative overflow-hidden">
				<div className="absolute inset-0 pointer-events-none">
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-100 bg-primary/5 rounded-full blur-[120px]" />
				</div>
				<div className="relative z-10 max-w-(--breakpoint-md) mx-auto text-center">
					<a
						href="/#features"
						className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-16 rounded-full border border-border bg-card px-3 py-1.5"
					>
						<svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<title>Back to all features</title>
							<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
						All features
					</a>
					<div>
						<div className="mb-6 inline-flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
							<Icon size={32} />
						</div>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6 leading-tight">
							{heroHeadline}
						</h1>
					</div>

					<p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
						{heroSubcopy}
					</p>
					<div className="flex items-center justify-center gap-4 flex-wrap">
						<a
							href="/login"
							className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
						>
							Get started <ArrowUpRight className="size-4" />
						</a>
					</div>
				</div>
			</section>

			{/* MDX Content */}
			<section className="px-6 pb-24">
				{headerImage && (
					<div className="max-w-(--breakpoint-md) mx-auto">
						<img
							src={headerImage}
							alt=""
							className="w-full mb-8 aspect-video object-cover object-top rounded-2xl shadow-xl"
						/>
					</div>
				)}
				<div className="max-w-(--breakpoint-md) mx-auto">
					<div
						className="prose prose-neutral dark:prose-invert max-w-none
						prose-headings:font-semibold prose-headings:tracking-tight
						prose-h2:text-3xl prose-h2:mt-20 prose-h2:mb-5 prose-h2:pt-8 prose-h2:border-border first:prose-h2:pt-0
						prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-3
						prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-base prose-p:my-4
						prose-ul:my-6 prose-ul:space-y-2 prose-ul:list-disc prose-ul:pl-6 [&_ul]:list-disc [&_ul]:pl-6
						prose-ol:my-6 prose-ol:space-y-2 prose-ol:list-decimal prose-ol:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
						prose-li:text-muted-foreground prose-li:leading-relaxed
						prose-strong:text-foreground prose-strong:font-semibold
						prose-a:text-primary prose-a:no-underline hover:prose-a:underline
						prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
						prose-hr:border-border prose-hr:my-16
						[&>*+h2]:mt-20 [&>*+h2]:pt-8 [&>*+h2]:pb-3 [&>*+h3]:mt-3 [&>*+h3]:pt-3 [&>*+h3]:pb-3 [&>*+h2]:border-border"
					>
						{content}
					</div>

					{docs && docs.length > 0 && (
						<div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2">
							<span className="text-xs text-muted-foreground">Learn more from the docs:</span>
							{docs.map((d) => (
								<a
									key={d.href}
									href={d.href}
									className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1 transition-colors hover:border-border/80 bg-card"
								>
									{d.label}
									<svg
										className="size-2.5 opacity-50"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2.5}
									>
										<title>{d.label}</title>
										<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
									</svg>
								</a>
							))}
						</div>
					)}

					{related && related.length > 0 && <RelatedFeatures slugs={related} />}

					{/* Bottom CTA */}
					<div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center relative overflow-hidden">
						<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
						<div className="relative z-10">
							<h3 className="text-2xl font-semibold tracking-tight mb-3">Ready to get started?</h3>
							<p className="text-muted-foreground mb-6 max-w-md mx-auto">
								Join teams using Sayr to manage work internally and share progress with their users.
							</p>
							<div className="flex items-center justify-center gap-4 flex-wrap">
								<a
									href="/login"
									className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
								>
									Get started <ArrowUpRight className="size-4" />
								</a>
								<a
									href="/pricing"
									className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
								>
									View pricing
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
