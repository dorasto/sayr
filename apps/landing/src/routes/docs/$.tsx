import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import browserCollections from "collections/browser";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { getMDXComponents } from "@/components/mdx";
import { docsTabs } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export const Route = createFileRoute("/docs/$")({
	component: Page,
	loader: async ({ params }) => {
		const slugs = params._splat?.split("/") ?? [];
		const data = await serverLoader({ data: slugs });
		await clientLoader.preload(data.path);
		return data;
	},
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
			toc: page.data.toc.map(({ depth, title, url }) => ({
				depth,
				title: typeof title === "string" ? title : String(title),
				url,
			})),
			pageTree,
		};
	});

const clientLoader = browserCollections.docs.createClientLoader({
	component({ default: MDX }) {
		return <MDX components={getMDXComponents()} />;
	},
});

function Page() {
	const data = useFumadocsLoader(Route.useLoaderData());
	const content = clientLoader.useContent(data.path);

	return (
		<DocsLayout tree={data.pageTree} tabs={docsTabs} tabMode="top">
			<DocsPage toc={data.toc}>
				<DocsTitle>{data.title}</DocsTitle>
				<DocsDescription>{data.description}</DocsDescription>
				<DocsBody>{content}</DocsBody>
			</DocsPage>
		</DocsLayout>
	);
}
