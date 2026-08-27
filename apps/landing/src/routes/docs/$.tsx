import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { MarkdownCopyButton, ViewOptionsPopover } from "@/components/ai/page-actions";
import { getMDXComponents } from "@/components/mdx";
import { baseOptions, docsTabs } from "@/lib/layout.shared";
import { encodeMarkdownUrl } from "@/lib/shared";
import { source } from "@/lib/source";

export const Route = createFileRoute("/docs/$")({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split("/") ?? [];
		const data = await serverLoader({ data: slugs });
		await clientLoader.preload(data.path);
		return data;
	},
	head: ({ loaderData }) =>
		loaderData
			? {
					meta: [
						{ title: `${loaderData.title} - Sayr` },
						{ name: "description", content: loaderData.description },
					],
				}
			: {},
});

const serverLoader = createServerFn({ method: "GET" })
	.inputValidator((slugs: string[]) => slugs)
	.handler(async ({ data: slugs }) => {
		const page = source.getPage(slugs);
		if (!page) throw notFound();

		const pageTree = await source.serializePageTree(source.getPageTree());
		return {
			path: page.path,
			title: page.data.title,
			description: page.data.description,
			pageTree,
			markdownUrl: encodeMarkdownUrl(page.slugs),
			githubUrl: `https://github.com/dorasto/sayr/blob/main/apps/landing/content/docs/${page.path}`,
		};
	});

// The compiled MDX module (not the server loader) is the only place `toc` is
// safe to read from — headings with inline code/formatting compile `toc[].title`
// to a `ReactNode`, which can't round-trip through the server-fn's serialized
// loader payload. `title`/`description`/`markdownUrl`/`githubUrl` are plain
// strings computed server-side above, so they're passed through as props instead.
const clientLoader = browserCollections.docs.createClientLoader<{
	title: string;
	description?: string;
	markdownUrl: string;
	githubUrl: string;
}>({
	component({ default: MDX, toc }, { title, description, markdownUrl, githubUrl }) {
		return (
			<DocsPage toc={toc}>
				<DocsTitle>{title}</DocsTitle>
				<DocsDescription>{description}</DocsDescription>
				<div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
					<MarkdownCopyButton markdownUrl={markdownUrl} />
					<ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
				</div>
				<DocsBody>
					<MDX components={getMDXComponents()} />
				</DocsBody>
			</DocsPage>
		);
	},
});

function Page() {
	const data = useFumadocsLoader(Route.useLoaderData());
	const content = clientLoader.useContent(data.path, {
		title: data.title,
		description: data.description,
		markdownUrl: data.markdownUrl,
		githubUrl: data.githubUrl,
	});

	return (
		<DocsLayout {...baseOptions()} tree={data.pageTree} tabs={docsTabs}>
			{content}
		</DocsLayout>
	);
}
